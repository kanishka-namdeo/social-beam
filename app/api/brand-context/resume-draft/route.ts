import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getBrandDraft, deleteBrandDraft } from "@/lib/db/brand-context";
import { getBrandAnalyzerGraph, setCurrentThreadIdForCheckpoint } from "@/lib/agent/brand-analyzer-graph";
import { requirePremium } from "@/lib/api-guards";
import { HumanMessage } from "@langchain/core/messages";

// GET: Check if draft exists, return metadata
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const draft = await getBrandDraft(workspaceId);
    if (!draft) {
      return NextResponse.json({ hasDraft: false });
    }

    // Build partial summary for UI
    const brandDraft = draft.brandContextDraft as Record<string, unknown> | null;
    let partialSummary = "";
    if (brandDraft?.businessName) {
      partialSummary = `Brand identity extracted for "${brandDraft.businessName}"`;
    } else if (draft.checkpointStep === "collected") {
      partialSummary = "Website content collected";
    } else if (draft.checkpointStep === "pages_selected") {
      partialSummary = "Relevant pages selected";
    } else if (draft.checkpointStep === "brand_analyzed") {
      partialSummary = "Brand identity analysis complete";
    } else if (draft.checkpointStep === "platforms_ready") {
      partialSummary = "Platform strategies generated";
    } else if (draft.checkpointStep === "samples_ready") {
      partialSummary = "Ready for review";
    }

    return NextResponse.json({
      hasDraft: true,
      draft: {
        id: draft.id,
        threadId: draft.threadId,
        checkpointStep: draft.checkpointStep,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        inputUrl: draft.inputUrl,
        inputDescription: draft.inputDescription,
        currentStep: draft.currentStep,
        partialSummary,
        hasBrandContextDraft: !!(brandDraft && Object.keys(brandDraft).length > 0),
        hasPlatformContextsDraft: !!(draft.platformContextsDraft && Object.keys(draft.platformContextsDraft as object).length > 0),
        hasSamplePosts: !!(draft.samplePosts && (draft.samplePosts as unknown[]).length > 0),
      },
    });
  } catch (err) {
    logger.error("api.draft_resume.get_error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Resume analysis from saved checkpoint
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premiumError = await requirePremium();
    if (premiumError) return premiumError;

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const draft = await getBrandDraft(workspaceId);
    if (!draft) {
      return NextResponse.json({ error: "No draft found. Please start a new analysis." }, { status: 404 });
    }

    const log = logger.child({ requestId });
    log.info("api.draft_resume.resume_start", { workspaceId, checkpointStep: draft.checkpointStep });

    const graph = await getBrandAnalyzerGraph();
    const encoder = new TextEncoder();

    // Set thread ID for checkpoint saves during resumed execution
    setCurrentThreadIdForCheckpoint(draft.threadId);

    let clearHeartbeatRef: (() => void) | undefined;
    const RESUME_DRAFT_TIMEOUT_MS = 180_000; // 3 minutes

    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        let heartbeatId: ReturnType<typeof setInterval> | undefined;

        const clearHeartbeat = () => {
          if (heartbeatId) clearInterval(heartbeatId);
          heartbeatId = undefined;
        };

        clearHeartbeatRef = clearHeartbeat;

        heartbeatId = setInterval(() => {
          if (req.signal.aborted) {
            clearHeartbeat();
            return;
          }
          const elapsed = Date.now() - startTime;
          const data = `data: ${JSON.stringify({ heartbeat: true, elapsedMs: elapsed })}\n\n`;
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            clearHeartbeat();
          }
        }, 10_000);

        try {
          // Determine which node to resume from based on checkpointStep
          const nextNode = getNextNodeAfterCheckpoint(draft.checkpointStep);

          log.info("api.draft_resume.resuming", { fromCheckpoint: draft.checkpointStep, nextNode, threadId: draft.threadId });

          // Send event so client transitions to streaming phase
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ resumed: true, checkpointStep: draft.checkpointStep, nextNode })}\n\n`));

          // Restore input fields from the draft snapshot so downstream nodes get real values
          const stateSnapshot = draft.stateSnapshot as Record<string, unknown>;

          // Reconstruct the original input that nodes depend on
          const resumeInput: Record<string, unknown> = {
            workspaceId: (stateSnapshot.workspaceId as string) ?? undefined,
            userId: (stateSnapshot.userId as string) ?? undefined,
            correlationId: (stateSnapshot.correlationId as string) ?? crypto.randomUUID(),
          };
          if (stateSnapshot.websiteUrl) resumeInput.websiteUrl = stateSnapshot.websiteUrl;
          if (stateSnapshot.brandDescription) resumeInput.brandDescription = stateSnapshot.brandDescription;

          // Reconstruct messages array for LLM nodes
          const messages = stateSnapshot.messages as Array<{ _type?: string; content?: string }> | undefined;
          if (messages && messages.length > 0) {
            resumeInput.messages = messages;
          } else if (stateSnapshot.brandDescription) {
            resumeInput.messages = [
              new HumanMessage(`Analyze this brand from the description: ${stateSnapshot.brandDescription}`),
            ];
          } else if (stateSnapshot.websiteUrl) {
            resumeInput.messages = [
              new HumanMessage(`Analyze this brand from the website: ${stateSnapshot.websiteUrl}`),
            ];
          }

          // Resume the graph by streaming from the saved thread state,
          // providing restored input fields so nodes that read them get valid values
          const resumeStream = await graph.stream(
            resumeInput,
            {
              configurable: { thread_id: draft.threadId },
              streamMode: "values",
            },
          );

          // Process stream similarly to the main stream route
          const emittedEvents = new Set<string>();
          let lastCrawlPageCount = stateSnapshot?.__crawlPages ? (stateSnapshot.__crawlPages as string[])?.length ?? 0 : 0;

          for await (const stateValue of resumeStream) {
            if (req.signal.aborted) {
              clearHeartbeat();
              try { controller.close(); } catch {}
              return;
            }
            if (!stateValue || typeof stateValue !== "object") continue;
            const output = stateValue as Record<string, unknown>;

            if (output?.currentStep) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: output.currentStep })}\n\n`));
            }

            const crawlPages = output?.__crawlPages as string[] | undefined;
            if (crawlPages && crawlPages.length > lastCrawlPageCount) {
              const newPages = crawlPages.slice(lastCrawlPageCount);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ crawl_progress: { pages: newPages, totalPages: crawlPages.length } })}\n\n`));
              lastCrawlPageCount = crawlPages.length;
            }

            if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0 && !emittedEvents.has("findings")) {
              const draft_data = output.brandContextDraft as Record<string, unknown>;
              if (draft_data.businessName || draft_data.tagline || draft_data.industry) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ identity_extracted: { businessName: draft_data.businessName ?? null, tagline: draft_data.tagline ?? null, industry: draft_data.industry ?? null } })}\n\n`));
              }
              if (draft_data.tonePreset || draft_data.voiceDescription) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ voice_extracted: { tonePreset: draft_data.tonePreset ?? null, voiceDescription: draft_data.voiceDescription ?? null } })}\n\n`));
              }
              if (draft_data.audienceType || draft_data.interests || draft_data.painPoints) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ audience_extracted: { audienceType: draft_data.audienceType ?? null, interests: Array.isArray(draft_data.interests) ? draft_data.interests : [], painPoints: Array.isArray(draft_data.painPoints) ? draft_data.painPoints : [] } })}\n\n`));
              }
              emittedEvents.add("findings");
            }

            if (output?.platformContextsDraft && Object.keys(output.platformContextsDraft as object).length > 0 && !emittedEvents.has("platforms_finding")) {
              const platforms = output.platformContextsDraft as Record<string, Record<string, unknown>>;
              for (const [platformKey, ctx] of Object.entries(platforms)) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ platform_ready: { platform: platformKey, tonePreset: (ctx as Record<string, unknown>).tonePreset ?? null, contentStyle: (ctx as Record<string, unknown>).contentStyle ?? null } })}\n\n`));
              }
              emittedEvents.add("platforms_finding");
            }

            if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ draft: output.brandContextDraft })}\n\n`));
            }

            if (output?.platformContextsDraft && Object.keys(output.platformContextsDraft as object).length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ platforms: output.platformContextsDraft })}\n\n`));
            }

            if (output?.samplePosts && Array.isArray(output.samplePosts) && (output.samplePosts as unknown[]).length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ samples: output.samplePosts })}\n\n`));
            }

            // Error detection
            if (output?.currentStep === "error" && !emittedEvents.has("error_emitted")) {
              emittedEvents.add("error_emitted");
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Resume analysis failed. Please try again.", errorCode: "resume_failed", suggestion: "Start a new analysis." })}\n\n`));
              clearHeartbeat();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, threadId: draft.threadId })}\n\n`));
              try { controller.close(); } catch {}
              return;
            }
          }

          // Check for interrupt (review phase)
          const pausedState = await graph.getState({ configurable: { thread_id: draft.threadId } });
          const stateValues = pausedState.values as Record<string, unknown>;
          const nextNodes = pausedState.next as string[] | undefined;
          const currentStep = stateValues?.currentStep as string | undefined;
          const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes("__interrupt__");

          if (isInterrupted || currentStep === "review") {
            const draftData = stateValues?.brandContextDraft ?? {};
            const platforms = stateValues?.platformContextsDraft ?? {};
            const samples = stateValues?.samplePosts ?? [];
            const connectedPlatforms = stateValues?.connectedPlatforms ?? [];
            const accountDetails = stateValues?.connectedAccountDetails ?? {};

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ interrupted: true, threadId: draft.threadId, draft: draftData, platforms, samples, connectedPlatforms, accountDetails })}\n\n`));
          }

          clearHeartbeat();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, threadId: draft.threadId })}\n\n`));
          try { controller.close(); } catch {}

          // Delete draft on successful completion
          await deleteBrandDraft(workspaceId);
          log.info("api.draft_resume.complete", { workspaceId });
        } catch (err) {
          clearHeartbeat();
          log.error("api.draft_resume.resume_error", { error: String(err) });
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to resume analysis.", errorCode: "resume_error", suggestion: "Try again or start fresh." })}\n\n`));
          } catch {
            // Client may have disconnected
          } finally {
            try { controller.close(); } catch {}
          }
        }
      },
      async cancel() {
        clearHeartbeatRef?.();
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
    logger.error("api.draft_resume.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Map checkpoint step to the next node that should execute */
function getNextNodeAfterCheckpoint(checkpointStep: string): string {
  const nodeMap: Record<string, string> = {
    collected: "brandPageSelector",
    pages_selected: "brandAnalyzer",
    brand_analyzed: "platformAdapter",
    platforms_ready: "sampleGenerator",
    samples_ready: "contextWait",
  };
  return nodeMap[checkpointStep] ?? "brandPageSelector";
}
