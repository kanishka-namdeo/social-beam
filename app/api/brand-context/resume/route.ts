import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandAnalyzerGraph } from "@/lib/agent/brand-analyzer-graph";
import { HumanMessage } from "@langchain/core/messages";

const ResumeRequestSchema = z.object({
  threadId: z.string().min(1),
  action: z.enum(["confirm", "feedback", "save_edits"]),
  feedback: z.string().optional(),
  edits: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = ResumeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { threadId, action, feedback, edits } = parsed.data;
    const log = logger.child({ requestId });
    log.info("api.brand_resume.start", { threadId, action, workspaceId });

    const graph = await getBrandAnalyzerGraph();
    const encoder = new TextEncoder();

    // Build the HumanMessage that resumes the graph
    let userMessage: HumanMessage;
    if (action === "confirm") {
      userMessage = new HumanMessage(
        "Looks right — please save this brand context.",
      );
    } else if (action === "feedback") {
      userMessage = new HumanMessage(
        feedback ?? "Please refine the brand context.",
      );
    } else {
      // save_edits — user made inline edits
      const editsSummary = edits
        ? Object.entries(edits)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
            .join(", ")
        : "No specific edits";
      userMessage = new HumanMessage(
        `I've made the following edits: ${editsSummary}. Please save the updated brand context.`,
      );
    }

    // Check current state to determine if we should invoke or just update
    const currentState = await graph.getState({ configurable: { thread_id: threadId } });
    const stateValues = currentState.values as Record<string, unknown>;
    const nextNodes = currentState.next as string[] | undefined;

    const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes("__interrupt__");

    if (!isInterrupted) {
      // Graph already finished, check if we need to re-run
      log.warn("api.brand_resume.not_interrupted", { threadId, action });
      return NextResponse.json(
        { error: "This session has already completed. Please start a new analysis." },
        { status: 400 },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use invoke for the resume — the graph picks up from the interrupt
          await graph.invoke(
            {
              messages: [userMessage],
              // For save_edits action, merge edits into the draft
              ...(action === "save_edits" && edits
                ? {
                    brandContextDraft: {
                      ...((stateValues?.brandContextDraft as Record<string, unknown>) ?? {}),
                      ...edits,
                    },
                    userFeedback: "",
                    userConfirmed: true,
                    currentStep: "review",
                  }
                : {}),
            },
            { configurable: { thread_id: threadId } },
          );

          const finalState = await graph.getState({ configurable: { thread_id: threadId } });
          const finalValues = finalState.values as Record<string, unknown>;

          // Stream updated draft/platforms/samples if they changed
          if (finalValues?.brandContextDraft) {
            const draftData = `data: ${JSON.stringify({ draft: finalValues.brandContextDraft })}\n\n`;
            controller.enqueue(encoder.encode(draftData));
          }
          if (finalValues?.platformContextsDraft) {
            const platformData = `data: ${JSON.stringify({ platforms: finalValues.platformContextsDraft })}\n\n`;
            controller.enqueue(encoder.encode(platformData));
          }
          if (finalValues?.samplePosts) {
            const samplesData = `data: ${JSON.stringify({ samples: finalValues.samplePosts })}\n\n`;
            controller.enqueue(encoder.encode(samplesData));
          }

          // Check if still interrupted (user wants more edits)
          const finalNextNodes = finalState.next as string[] | undefined;
          const stillInterrupted =
            Array.isArray(finalNextNodes) && finalNextNodes.includes("__interrupt__");

          if (stillInterrupted) {
            const data = `data: ${JSON.stringify({
              interrupted: true,
              threadId,
              draft: finalValues?.brandContextDraft ?? {},
              platforms: finalValues?.platformContextsDraft ?? {},
              samples: finalValues?.samplePosts ?? [],
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          } else {
            // Graph completed — saved successfully
            log.info("api.brand_resume.saved", { threadId, workspaceId });
            const savedData = `data: ${JSON.stringify({ saved: true, threadId })}\n\n`;
            controller.enqueue(encoder.encode(savedData));
          }

          log.info("api.brand_resume.done", { correlationId: requestId, threadId, action });
          const doneData = `data: ${JSON.stringify({ done: true, threadId })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          log.error("api.brand_resume.error", { error: String(error), threadId });
          const errorData = `data: ${JSON.stringify({ error: "Resume failed" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/resume", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
