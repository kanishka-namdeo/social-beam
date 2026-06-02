import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { upsertBrandContext, getBrandContext, upsertPlatformContext } from "@/lib/db/brand-context";
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

    const { threadId, action, edits } = parsed.data;
    const log = logger.child({ requestId });
    log.info("api.brand_resume.start", { threadId, action, workspaceId });

    // For confirm/save_edits actions, save brand context directly from thread state
    // and return an SSE stream so the client can transition to the "complete" phase.
    if (action === "confirm" || action === "save_edits") {
      const graph = await getBrandAnalyzerGraph();
      const currentState = await graph.getState({ configurable: { thread_id: threadId } });
      const stateValues = currentState.values as Record<string, unknown>;
      const draft = stateValues?.brandContextDraft as Record<string, unknown> | undefined;
      const platformDrafts = stateValues?.platformContextsDraft as Record<string, Record<string, unknown>> | undefined;

      if (!draft || Object.keys(draft).length === 0) {
        log.warn("api.brand_resume.no_draft", { threadId });
        return NextResponse.json(
          { error: "No brand context data found. Please start a new analysis." },
          { status: 400 },
        );
      }

      const mergedEdits = action === "save_edits" && edits
        ? {
            ...draft,
            ...edits,
            bannedWords: edits.bannedWords ?? draft.bannedWords ?? [],
            interests: edits.interests ?? draft.interests ?? [],
            painPoints: edits.painPoints ?? draft.painPoints ?? [],
            competitors: edits.competitors ?? draft.competitors ?? [],
            goals: edits.goals ?? draft.goals ?? [],
            voiceExamples: edits.voiceExamples ?? draft.voiceExamples ?? [],
          }
        : draft;

      const websiteUrlVal = mergedEdits.websiteUrl as string | undefined;
      const urlForSave = websiteUrlVal && (websiteUrlVal.startsWith("http://") || websiteUrlVal.startsWith("https://")) ? websiteUrlVal : undefined;

      await upsertBrandContext(workspaceId, {
        businessName: mergedEdits.businessName as string | undefined,
        tagline: mergedEdits.tagline as string | undefined,
        ...(urlForSave ? { websiteUrl: urlForSave } : {}),
        industry: mergedEdits.industry as string | undefined,
        productDesc: mergedEdits.productDesc as string | undefined,
        tonePreset: mergedEdits.tonePreset as string | undefined,
        voiceDescription: mergedEdits.voiceDescription as string | undefined,
        bannedWords: (mergedEdits.bannedWords as string[]) ?? [],
        voiceExamples: (mergedEdits.voiceExamples as Array<{ text: string; source?: string }>) ?? [],
        audienceType: mergedEdits.audienceType as string | undefined,
        demographics: mergedEdits.demographics as Record<string, unknown> | undefined,
        interests: (mergedEdits.interests as string[]) ?? [],
        painPoints: (mergedEdits.painPoints as string[]) ?? [],
        competitors: (mergedEdits.competitors as string[]) ?? [],
        goals: (mergedEdits.goals as string[]) ?? [],
        trainingStatus: "trained",
      });

      if (platformDrafts && Object.keys(platformDrafts).length > 0) {
        const brandCtx = await getBrandContext(workspaceId);
        if (brandCtx) {
          for (const [platform, pc] of Object.entries(platformDrafts)) {
            await upsertPlatformContext(brandCtx.id, platform, {
              platformTone: pc.platformTone as string | undefined,
              contentMix: pc.contentMix as Record<string, unknown> | undefined,
              postingCadence: pc.postingCadence as string | undefined,
              hashtagStrategy: pc.hashtagStrategy as Record<string, unknown> | undefined,
              visualStyle: pc.visualStyle as string | undefined,
              engagementStyle: pc.engagementStyle as string | undefined,
              platformRules: (pc.platformRules as string[]) ?? [],
            });
          }
        }
      }

      log.info("api.brand_resume.saved", { threadId, workspaceId });

      // Return SSE stream with saving → saved events so client transitions correctly
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "saving", saving: true })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saved: true })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Feedback action — resume the graph with feedback as a human message and stream back
    if (action === "feedback") {
      log.info("api.brand_resume.feedback", { threadId, feedbackLength: parsed.data.feedback?.length });

      const graph = await getBrandAnalyzerGraph();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "streaming", subStep: "Processing feedback..." })}\n\n`));

            const resumeStream = await graph.stream(
              {
                messages: [new HumanMessage(parsed.data.feedback ?? "")],
                userFeedback: parsed.data.feedback ?? "",
                userConfirmed: false,
              },
              {
                configurable: { thread_id: threadId },
                streamMode: "values",
              },
            );

            for await (const stateValue of resumeStream) {
              if (!stateValue || typeof stateValue !== "object") continue;
              const output = stateValue as Record<string, unknown>;

              if (output?.currentStep) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: output.currentStep })}\n\n`));
              }

              if (output?.brandContextDraft) {
                const draft = output.brandContextDraft as Record<string, unknown>;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ draft, interrupted: true, threadId })}\n\n`));
              }
            }

            controller.close();
          } catch (err) {
            log.error("api.brand_resume.feedback_stream_error", { error: String(err) });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to process feedback" })}\n\n`));
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
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/resume", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
