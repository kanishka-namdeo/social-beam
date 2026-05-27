import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandAnalyzerGraph } from "@/lib/agent/brand-analyzer-graph";
import { shutdownCrawler } from "@/lib/agent/crawler";
import { HumanMessage } from "@langchain/core/messages";

const StreamRequestSchema = z.object({
  websiteUrl: z.string().url("Must be a valid URL").optional(),
  brandDescription: z.string().max(2000).optional(),
}).refine((data) => {
  if (!data.websiteUrl && !data.brandDescription) {
    return { error: "Either websiteUrl or brandDescription is required" };
  }
  return true;
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
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const eventStream = graph.streamEvents(
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
              version: "v2",
              configurable: { thread_id: threadId },
            },
          );

          for await (const event of eventStream) {
            const eventType = event.event;
            const eventData = event.data as Record<string, unknown> | undefined;

            // Stream LLM tokens for user-facing progress text
            if (eventType === "on_chat_model_stream") {
              const chunk = eventData?.chunk as Record<string, unknown> | undefined;
              const token = chunk?.content ?? "";
              if (token) {
                const data = `data: ${JSON.stringify({ content: token })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }

            // Track which granular events have already been emitted to avoid duplicates
            const emittedEvents = new Set<string>();

            // Stream node progress events
            if (eventType === "on_chain_end") {
              const output = eventData?.output as Record<string, unknown> | undefined;

              // Stream current step for progress indicator
              if (output?.currentStep) {
                const stepData = `data: ${JSON.stringify({ step: output.currentStep })}\n\n`;
                controller.enqueue(encoder.encode(stepData));
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
                  controller.enqueue(encoder.encode(summaryData));
                  emittedEvents.add("content_summary");
                }
              }

              // Emit granular findings when brand analyzer completes
              if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0 && !emittedEvents.has("findings")) {
                const draft = output.brandContextDraft as Record<string, unknown>;

                // Identity findings
                if (draft.businessName || draft.tagline || draft.industry) {
                  const identityData = `data: ${JSON.stringify({
                    identity_extracted: {
                      businessName: draft.businessName ?? null,
                      tagline: draft.tagline ?? null,
                      industry: draft.industry ?? null,
                    },
                  })}\n\n`;
                  controller.enqueue(encoder.encode(identityData));
                }

                // Voice findings
                if (draft.tonePreset || draft.voiceDescription) {
                  const voiceData = `data: ${JSON.stringify({
                    voice_extracted: {
                      tonePreset: draft.tonePreset ?? null,
                      voiceDescription: draft.voiceDescription ?? null,
                    },
                  })}\n\n`;
                  controller.enqueue(encoder.encode(voiceData));
                }

                // Audience findings
                if (draft.audienceType || draft.interests || draft.painPoints) {
                  const audienceData = `data: ${JSON.stringify({
                    audience_extracted: {
                      audienceType: draft.audienceType ?? null,
                      interests: Array.isArray(draft.interests) ? draft.interests : [],
                      painPoints: Array.isArray(draft.painPoints) ? draft.painPoints : [],
                    },
                  })}\n\n`;
                  controller.enqueue(encoder.encode(audienceData));
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
                      tonePreset: ctx.tonePreset ?? null,
                      contentStyle: ctx.contentStyle ?? null,
                    },
                  })}\n\n`;
                  controller.enqueue(encoder.encode(platformData));
                }
                emittedEvents.add("platforms_finding");
              }

              // Stream brand context draft when available
              if (output?.brandContextDraft && Object.keys(output.brandContextDraft as object).length > 0) {
                const draftData = `data: ${JSON.stringify({ draft: output.brandContextDraft })}\n\n`;
                controller.enqueue(encoder.encode(draftData));
              }

              // Stream platform contexts draft
              if (output?.platformContextsDraft && Object.keys(output.platformContextsDraft as object).length > 0) {
                const platformData = `data: ${JSON.stringify({ platforms: output.platformContextsDraft })}\n\n`;
                controller.enqueue(encoder.encode(platformData));
              }

              // Stream connected platforms and account details (Phase 4)
              if (output?.connectedPlatforms && Array.isArray(output.connectedPlatforms) && (output.connectedPlatforms as unknown[]).length > 0) {
                const connectedData = `data: ${JSON.stringify({ connectedPlatforms: output.connectedPlatforms, accountDetails: output.connectedAccountDetails })}\n\n`;
                controller.enqueue(encoder.encode(connectedData));
              }

              // Stream sample posts
              if (output?.samplePosts && Array.isArray(output.samplePosts) && (output.samplePosts as unknown[]).length > 0) {
                const samplesData = `data: ${JSON.stringify({ samples: output.samplePosts })}\n\n`;
                controller.enqueue(encoder.encode(samplesData));
              }
            }
          }

          // After stream ends, check for interrupt
          const finalState = await graph.getState({ configurable: { thread_id: threadId } });
          const nextNodes = finalState.next as string[] | undefined;
          const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes("__interrupt__");

          const stateValues = finalState.values as Record<string, unknown>;

          if (isInterrupted) {
            log.info("api.brand_stream.interrupted", { threadId });
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
          }

          log.info("api.brand_stream.done", { correlationId: requestId, threadId });
          const doneData = `data: ${JSON.stringify({ done: true, threadId })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          log.error("api.brand_stream.error", { error: String(error) });
          const errorData = `data: ${JSON.stringify({ error: "Brand analysis stream failed" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        } finally {
          await shutdownCrawler();
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
    logger.error("api.request.error", { path: "/api/brand-context/stream", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
