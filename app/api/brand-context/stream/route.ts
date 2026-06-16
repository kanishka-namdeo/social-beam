import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandAnalyzerGraph, runWithThreadId } from "@/lib/agent/brand-analyzer-graph";
import { shutdownCrawler } from "@/lib/agent/crawler";
import { HumanMessage } from "@langchain/core/messages";
import { requirePremium } from "@/lib/api-guards";
import { startActivity, completeActivity, failActivity } from "@/lib/activity-tracker";
import { ActivityType } from "@/app/generated/prisma";
import { slidingWindowRateLimit } from "@/lib/redis-rate-limiter";

const StreamRequestSchema = z.object({
  websiteUrl: z.string().url("Must be a valid URL").optional(),
  brandDescription: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (!data.websiteUrl && !data.brandDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either websiteUrl or brandDescription is required",
    });
  }
});

const HEARTBEAT_INTERVAL_MS = 10_000;
const LANGGRAPH_TIMEOUT_MS = 180_000; // 3 minutes

/** Categorize an error string into a structured error code and user-friendly message. */
function categorizeError(errMsg: string): { errorCode: string; error: string; suggestion: string } {
  const msg = errMsg.toLowerCase();
  if (msg.includes("timed out") || msg.includes("timeout")) {
    return {
      errorCode: "analysis_timeout",
      error: "Analysis took too long. This site may be too complex.",
      suggestion: "Try describing your brand manually instead.",
    };
  }
  if (msg.includes("403") || msg.includes("blocked") || msg.includes("captcha") || msg.includes("forbidden")) {
    return {
      errorCode: "anti_bot_detected",
      error: "This website blocks automated visits.",
      suggestion: "Try describing your brand manually instead.",
    };
  }
  if (msg.includes("aborted") || msg.includes("aborterror") || msg.includes("canceled")) {
    return {
      errorCode: "canceled",
      error: "Analysis was canceled.",
      suggestion: "Start a new analysis when ready.",
    };
  }
  if (msg.includes("enotfound") || msg.includes("err_name_not_resolved") || msg.includes("network") || msg.includes("fetch")) {
    return {
      errorCode: "site_unreachable",
      error: "Could not reach this website.",
      suggestion: "Check the URL and try again.",
    };
  }
  if (msg.includes("no readable content") || msg.includes("empty content") || msg.includes("no content") || msg.includes("no content found")) {
    return {
      errorCode: "empty_content",
      error: "The website loaded but had no readable content.",
      suggestion: "Try a different URL or describe your brand manually.",
    };
  }
  if (msg.includes("parse") || msg.includes("parsing") || msg.includes("json")) {
    return {
      errorCode: "parse_error",
      error: "Analysis completed but we couldn't process the results.",
      suggestion: "Try again or describe your brand manually.",
    };
  }
  return {
    errorCode: "unknown_error",
    error: "Analysis failed.",
    suggestion: "Try again or describe your brand manually.",
  };
}

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

    // Rate limit: 5 requests per minute per workspace
    const rateLimitResult = await slidingWindowRateLimit(`brand-context:stream:${workspaceId}`, 5, 60_000);
    if (!rateLimitResult.allowed) {
      logger.warn("api.brand_context.stream.rate_limit_exceeded", { workspaceId });
      return NextResponse.json(
        { error: "Too many requests. Please wait before starting another brand analysis." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } }
      );
    }

    const body = await req.json();
    const parsed = StreamRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { websiteUrl, brandDescription } = parsed.data;
    const log = logger.child({ requestId });
    log.info("api.brand_stream.start", { workspaceId, websiteUrl, hasDescription: !!brandDescription });

    const graph = await getBrandAnalyzerGraph();
    const threadId = `brand-analyze-${workspaceId}-${Date.now()}`;

    // Start activity tracking for this brand analysis
    const activityLogId = await startActivity(workspaceId, ActivityType.BRAND_ANALYSIS, {
      threadId,
      inputType: websiteUrl ? "website" : "description",
    });
    let streamSucceeded = false;
    let streamError: string | undefined;

    const encoder = new TextEncoder();

    // Shared state between start() and cancel() for cleanup
    let heartbeatId: ReturnType<typeof setInterval> | undefined;
    const startTime = Date.now();

    const clearHeartbeat = () => {
      if (heartbeatId) clearInterval(heartbeatId);
      heartbeatId = undefined;
    };

    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat: keep SSE connection alive during long operations

        // Check for client disconnect before enqueuing
        const safeEnqueue = (data: Uint8Array) => {
          if (req.signal.aborted) {
            clearHeartbeat();
            return false;
          }
          try {
            controller.enqueue(data);
            return true;
          } catch {
            clearHeartbeat();
            return false;
          }
        };

        heartbeatId = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const data = `data: ${JSON.stringify({ heartbeat: true, elapsedMs: elapsed })}\n\n`;
          if (!safeEnqueue(encoder.encode(data))) {
            // Stream closed, stop heartbeat
          }
        }, HEARTBEAT_INTERVAL_MS);

        try {
          // Track which granular events have already been emitted
          const emittedEvents = new Set<string>();
          // Track last known crawl pages for per-page progress
          let lastCrawlPageCount = 0;

          // Check for abort before starting streaming
          if (req.signal.aborted) {
            clearHeartbeat();
            controller.close();
            return;
          }

          // Timeout to prevent indefinite hangs if LLM or graph execution stalls
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`LangGraph execution timeout after ${LANGGRAPH_TIMEOUT_MS}ms`)), LANGGRAPH_TIMEOUT_MS);
          });

          const nodeStream = await Promise.race([
            graph.stream(
              {
                ...(websiteUrl ? { websiteUrl } : {}),
                ...(brandDescription ? { brandDescription } : {}),
                workspaceId,
                userId: session.user.id ?? "unknown",
                correlationId: requestId,
                messages: [
                  new HumanMessage(
                    brandDescription
                      ? `Analyze this brand from the description: ${brandDescription}`
                      : `Analyze this brand from the website: ${websiteUrl}`
                  ),
                ],
              },
              {
                configurable: { thread_id: threadId },
                streamMode: "values",
              },
            ),
            timeoutPromise,
          ]);

          for await (const stateValue of nodeStream) {
            // Check for client disconnect during streaming
            if (req.signal.aborted) {
              clearHeartbeat();
              await shutdownCrawler();
              controller.close();
              return;
            }

            if (!stateValue || typeof stateValue !== "object") continue;
            const output = stateValue as Record<string, unknown>;

            // Stream current step for progress indicator
            if (output?.currentStep) {
              const stepData = `data: ${JSON.stringify({ step: output.currentStep })}\n\n`;
              if (!safeEnqueue(encoder.encode(stepData))) return;
            }

            // Emit per-page crawl progress as pages are crawled (streamed in real-time)
            const crawlPages = output?.__crawlPages as string[] | undefined;
            if (crawlPages && crawlPages.length > lastCrawlPageCount) {
              const newPages = crawlPages.slice(lastCrawlPageCount);
              const pageData = `data: ${JSON.stringify({
                crawl_progress: {
                  pages: newPages,
                  totalPages: crawlPages.length,
                },
              })}\n\n`;
              if (!safeEnqueue(encoder.encode(pageData))) return;
              lastCrawlPageCount = crawlPages.length;
            }

            // Emit page_selection when the page selector finishes selecting top relevant pages
            if (output?.__selectedPages && Array.isArray(output.__selectedPages) && (output.__selectedPages as unknown[]).length > 0 && !emittedEvents.has("page_selection")) {
              const totalPages = output?.__totalPagesBefore as number | undefined;
              const selectedPages = output.__selectedPages as string[];
              if (totalPages && totalPages > selectedPages.length) {
                const selectionData = `data: ${JSON.stringify({
                  page_selection: {
                    totalPages,
                    selectedCount: selectedPages.length,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(selectionData))) return;
                emittedEvents.add("page_selection");
              } else if (totalPages && totalPages <= selectedPages.length) {
                // All pages selected (no filtering occurred, but still emit for transparency)
                const selectionData = `data: ${JSON.stringify({
                  page_selection: {
                    totalPages,
                    selectedCount: selectedPages.length,
                    skipped: true,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(selectionData))) return;
                emittedEvents.add("page_selection");
              }
            }

            // Emit content_summary when collector finishes crawling
            if (output?.currentStep === "analyze" && !emittedEvents.has("content_summary")) {
              const crawled = output?.crawledContent as Record<string, { page: string; zone: string; weight: number; text: string }> | undefined;
              if (crawled && Object.keys(crawled).length > 0) {
                const pages = [...new Set(Object.values(crawled).map((c) => c.page))];
                const summaryData = `data: ${JSON.stringify({
                  content_summary: {
                    pagesFound: pages,
                    pageCount: pages.length,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(summaryData))) return;
                emittedEvents.add("content_summary");
              }
            }

            // Detect error state and emit categorized error immediately
            if (output?.currentStep === "error" && !emittedEvents.has("error_emitted")) {
              emittedEvents.add("error_emitted");
              const crawlError = output?.__crawlError as string | undefined;
              // Get error message from messages array if available (from analyzer nodes)
              const messages = output?.messages as Array<{ content?: string }> | undefined;
              const lastMessage = messages?.[messages.length - 1];
              const messageContent = lastMessage?.content;
              const errMsg = crawlError || (typeof messageContent === 'string' ? messageContent : "Analysis failed — no content available.");
              const categorized = categorizeError(errMsg);

              const errorData = `data: ${JSON.stringify({
                error: categorized.error,
                errorCode: categorized.errorCode,
                suggestion: categorized.suggestion,
              })}\n\n`;
              if (!safeEnqueue(encoder.encode(errorData))) return;
              log.warn("api.brand_stream.graph_error", { threadId, errorCode: categorized.errorCode });
              streamError = categorized.errorCode;
              clearHeartbeat();
              log.info("api.brand_stream.done", { correlationId: requestId, threadId });
              const doneData = `data: ${JSON.stringify({ done: true, threadId })}\n\n`;
              if (!safeEnqueue(encoder.encode(doneData))) return;
              controller.close();
              return;
            }

            // Emit granular findings when brand analyzer completes
            if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0 && !emittedEvents.has("findings")) {
              const draft = output.brandContextDraft as Record<string, unknown>;

              if (draft.businessName || draft.tagline || draft.industry) {
                const identityData = `data: ${JSON.stringify({
                  identity_extracted: {
                    businessName: draft.businessName ?? null,
                    tagline: draft.tagline ?? null,
                    industry: draft.industry ?? null,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(identityData))) return;
              }

              if (draft.tonePreset || draft.voiceDescription) {
                const voiceData = `data: ${JSON.stringify({
                  voice_extracted: {
                    tonePreset: draft.tonePreset ?? null,
                    voiceDescription: draft.voiceDescription ?? null,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(voiceData))) return;
              }

              if (draft.audienceType || draft.interests || draft.painPoints) {
                const audienceData = `data: ${JSON.stringify({
                  audience_extracted: {
                    audienceType: draft.audienceType ?? null,
                    interests: Array.isArray(draft.interests) ? draft.interests : [],
                    painPoints: Array.isArray(draft.painPoints) ? draft.painPoints : [],
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(audienceData))) return;
              }

              emittedEvents.add("findings");
            }

            // Emit platform_ready per platform when platform adapter completes
            if (output?.platformContextsDraft && Object.keys(output.platformContextsDraft as object).length > 0 && !emittedEvents.has("platforms_finding")) {
              const platforms = output.platformContextsDraft as Record<string, Record<string, unknown>>;
              for (const [platformKey, ctx] of Object.entries(platforms)) {
                const platformData = `data: ${JSON.stringify({
                  platform_ready: {
                    platform: platformKey,
                    tonePreset: (ctx as Record<string, unknown>).tonePreset ?? null,
                    contentStyle: (ctx as Record<string, unknown>).contentStyle ?? null,
                  },
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(platformData))) return;
              }
              emittedEvents.add("platforms_finding");
            }

            // Stream brand context draft when available
            if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0) {
              const draftData = `data: ${JSON.stringify({ draft: output.brandContextDraft })}\n\n`;
              if (!safeEnqueue(encoder.encode(draftData))) return;
            }

            // Stream platform contexts draft
            if (output?.platformContextsDraft && Object.keys(output.platformContextsDraft as object).length > 0) {
              const platformData = `data: ${JSON.stringify({ platforms: output.platformContextsDraft })}\n\n`;
              if (!safeEnqueue(encoder.encode(platformData))) return;
            }

            // Stream connected platforms and account details (Phase 4)
            if (output?.connectedPlatforms && Array.isArray(output.connectedPlatforms) && (output.connectedPlatforms as unknown[]).length > 0) {
              const connectedData = `data: ${JSON.stringify({ connectedPlatforms: output.connectedPlatforms, accountDetails: output.connectedAccountDetails })}\n\n`;
              if (!safeEnqueue(encoder.encode(connectedData))) return;
            }

            // Stream sample posts
            if (output?.samplePosts && Array.isArray(output.samplePosts) && (output.samplePosts as unknown[]).length > 0) {
              const samplesData = `data: ${JSON.stringify({ samples: output.samplePosts })}\n\n`;
              if (!safeEnqueue(encoder.encode(samplesData))) return;
            }
          }

          // The stream above stops at the `interruptBefore` boundary (contextWait).
          // The thread is now paused, waiting for user input via /resume.
          const pausedState = await graph.getState({ configurable: { thread_id: threadId } });
          const stateValues = pausedState.values as Record<string, unknown>;
          const nextNodes = pausedState.next as string[] | undefined;
          const currentStep = stateValues?.currentStep as string | undefined;

          // If the graph hit an error node before reaching interrupt, emit a categorized error
          if (currentStep === "error" && !emittedEvents.has("error_emitted")) {
            const crawlError = stateValues?.__crawlError as string | undefined;
            // Get error message from messages array if available (from analyzer nodes)
            const messages = stateValues?.messages as Array<{ content?: string }> | undefined;
            const lastMessage = messages?.[messages.length - 1];
            const messageContent = lastMessage?.content;
            const errMsg = crawlError || (typeof messageContent === 'string' ? messageContent : "Analysis failed — no content available.");
            const categorized = categorizeError(errMsg);

            const errorData = `data: ${JSON.stringify({
              error: categorized.error,
              errorCode: categorized.errorCode,
              suggestion: categorized.suggestion,
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            clearHeartbeat();
            log.info("api.brand_stream.done", { correlationId: requestId, threadId });
            const doneData = `data: ${JSON.stringify({ done: true, threadId })}\n\n`;
            controller.enqueue(encoder.encode(doneData));
            controller.close();
            return;
          }

          // Emit the review payload so the client transitions to review phase
          const draft = stateValues?.brandContextDraft ?? {};
          const hasDraft = Object.keys(draft).length > 0;
          const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes("__interrupt__");
          const shouldShowReview = isInterrupted || (currentStep === "review" && hasDraft);

          if (shouldShowReview) {
            log.info("api.brand_stream.interrupted", { threadId, currentStep, hasDraft, isInterrupted });
            const platforms = stateValues?.platformContextsDraft ?? {};
            const samples = stateValues?.samplePosts ?? [];
            const connectedPlatforms = stateValues?.connectedPlatforms ?? [];
            const accountDetails = stateValues?.connectedAccountDetails ?? {};

            const data = `data: ${JSON.stringify({
              interrupted: true,
              threadId,
              draft,
              platforms,
              samples,
              connectedPlatforms,
              accountDetails,
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          } else if (!isInterrupted && currentStep !== "error") {
            log.warn("api.brand_stream.no_review_data", { threadId, currentStep, draftKeys: Object.keys(draft as object) });
          }

          // Final safety check: if we have no draft and no interrupt, something went wrong
          // Emit a generic error to ensure the client doesn't hang
          if (!hasDraft && !isInterrupted && currentStep !== "error" && !emittedEvents.has("error_emitted")) {
            const errorData = `data: ${JSON.stringify({
              error: "Analysis failed — no content available.",
              errorCode: "unknown_error",
              suggestion: "Try again or describe your brand manually.",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            emittedEvents.add("error_emitted");
          }

          clearHeartbeat();

          // Delete draft since brand context is now fully saved (only on success path)
          if (hasDraft && shouldShowReview) {
            const { deleteBrandDraft } = await import("@/lib/db/brand-context");
            await deleteBrandDraft(workspaceId).catch(() => {});
          }
          streamSucceeded = true;
          log.info("api.brand_stream.done", { correlationId: requestId, threadId });
          const doneData = `data: ${JSON.stringify({ done: true, threadId })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          clearHeartbeat();
          const errMsg = String(error);
          // GraphInterrupt from interrupt() is expected — treat as successful interrupt, not error
          if (errMsg.includes("GraphInterrupt") || errMsg.includes("interrupt")) {
            log.info("api.brand_stream.interrupted", { threadId });
            streamSucceeded = true;
            try {
              const finalState = await graph.getState({ configurable: { thread_id: threadId } });
              const stateValues = finalState.values as Record<string, unknown>;
              const draft = stateValues?.brandContextDraft ?? {};
              const platforms = stateValues?.platformContextsDraft ?? {};
              const samples = stateValues?.samplePosts ?? [];
              const connectedPlatforms = stateValues?.connectedPlatforms ?? [];
              const accountDetails = stateValues?.connectedAccountDetails ?? {};

              const data = `data: ${JSON.stringify({
                interrupted: true,
                threadId,
                draft,
                platforms,
                samples,
                connectedPlatforms,
                accountDetails,
              })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } catch (getStateErr) {
              log.error("api.brand_stream.interrupt_state_error", { error: String(getStateErr) });
            }
          } else {
            streamError = errMsg;
            log.error("api.brand_stream.error", { error: errMsg });
            const categorized = categorizeError(errMsg);
            const errorData = `data: ${JSON.stringify({
              error: categorized.error,
              errorCode: categorized.errorCode,
              suggestion: categorized.suggestion,
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          }
          controller.close();
        } finally {
          clearHeartbeat();
          await shutdownCrawler();

          // Complete or fail the activity
          if (streamSucceeded) {
            await completeActivity(activityLogId, {
              threadId,
              duration: Date.now() - startTime,
              status: streamError ? "completed_with_errors" : "completed",
            });
          } else if (streamError) {
            await failActivity(activityLogId, streamError, {
              threadId,
              duration: Date.now() - startTime,
            });
          } else {
            // Stream closed without success or explicit error (client disconnect, etc.)
            await failActivity(activityLogId, "Stream closed unexpectedly", {
              threadId,
              duration: Date.now() - startTime,
            });
          }
        }
      },
      async cancel() {
        // Client disconnected — clean up heartbeat and crawler
        clearHeartbeat();
        await shutdownCrawler();
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
    logger.error("api.request.error", { path: "/api/brand-context/stream", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
