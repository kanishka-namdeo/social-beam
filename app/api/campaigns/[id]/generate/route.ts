import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { generatePhasePostsWithVariants, loadCampaignBrandContext, type CampaignBrief } from "@/lib/ai/campaign-generator";
import { logCampaignActivity } from "@/lib/campaign-activity";
import { slidingWindowRateLimit } from "@/lib/redis-rate-limiter";

const generateSchema = z.object({
  phaseId: z.string().optional(),
  platforms: z.array(z.string()).min(1),
  regeneratePostIds: z.array(z.string()).optional(),
});

async function deletePostsForPhase(campaignId: string, phaseId: string): Promise<number> {
  const campaignPosts = await prisma.campaignPost.findMany({
    where: { campaignId, phaseId },
    select: { postId: true },
  });

  if (campaignPosts.length === 0) return 0;

  const postIds = campaignPosts.map((cp) => cp.postId);

  await prisma.$transaction([
    prisma.campaignPost.deleteMany({ where: { campaignId, phaseId } }),
    prisma.postPlatform.deleteMany({ where: { postId: { in: postIds } } }),
    prisma.post.deleteMany({ where: { id: { in: postIds } } }),
  ]);

  return postIds.length;
}

async function deleteSpecificPosts(campaignId: string, postIds: string[]): Promise<number> {
  if (postIds.length === 0) return 0;

  const campaignPosts = await prisma.campaignPost.findMany({
    where: { campaignId, postId: { in: postIds } },
    select: { postId: true },
  });

  const validPostIds = campaignPosts.map((cp) => cp.postId);
  if (validPostIds.length === 0) return 0;

  await prisma.$transaction([
    prisma.campaignPost.deleteMany({ where: { campaignId, postId: { in: validPostIds } } }),
    prisma.postPlatform.deleteMany({ where: { postId: { in: validPostIds } } }),
    prisma.post.deleteMany({ where: { id: { in: validPostIds } } }),
  ]);

  return validPostIds.length;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premiumError = await requirePremium();
    if (premiumError) return premiumError;

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { id: campaignId } = await params;

    // Rate limit: 5 requests per minute per workspace
    const rateLimitResult = await slidingWindowRateLimit(`campaigns:generate:${workspaceId}`, 5, 60_000);
    if (!rateLimitResult.allowed) {
      log.warn("api.campaigns.generate.rate_limit_exceeded", { workspaceId, campaignId });
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating more campaign posts." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: { phases: { orderBy: { order: "asc" } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { phaseId, platforms, regeneratePostIds } = parsed.data;

    const brief: CampaignBrief = {
      name: campaign.name,
      description: campaign.description ?? undefined,
      goal: campaign.goal ?? undefined,
      audience: campaign.audience ?? undefined,
      duration: campaign.duration ?? undefined,
    };

    const brandCtx = await loadCampaignBrandContext(workspaceId);

    // Determine which phases to generate for
    const targetPhases = phaseId
      ? campaign.phases.filter((p) => p.id === phaseId)
      : campaign.phases;

    if (targetPhases.length === 0) {
      return NextResponse.json({ error: "No phases found to generate" }, { status: 404 });
    }

    // Idempotency: delete existing posts before regenerating
    if (regeneratePostIds && regeneratePostIds.length > 0) {
      const deletedCount = await deleteSpecificPosts(campaignId, regeneratePostIds);
      log.info("api.campaigns.generate.regenerated_specific", { campaignId, deletedCount, postIds: regeneratePostIds });
    } else if (phaseId) {
      const deletedCount = await deletePostsForPhase(campaignId, phaseId);
      log.info("api.campaigns.generate.regenerated_phase", { campaignId, phaseId, deletedCount });
    } else {
      for (const phase of targetPhases) {
        const deletedCount = await deletePostsForPhase(campaignId, phase.id);
        if (deletedCount > 0) {
          log.info("api.campaigns.generate.regenerated_phase", { campaignId, phaseId: phase.id, deletedCount });
        }
      }
    }

    // Check for partial generation (resuming)
    const existingPostsAfterCleanup = await prisma.campaignPost.findMany({
      where: { campaignId },
      select: { phaseId: true },
    });
    const isResuming = campaign.status === "DRAFT" && existingPostsAfterCleanup.length > 0;

    // Fetch existing posts for narrative continuity
    const existingPosts = await prisma.campaignPost.findMany({
      where: { campaignId },
      include: {
        post: { select: { PostPlatform: { select: { platform: true, content: true } } } },
      },
      orderBy: { order: "asc" },
    });

    const previousPosts = existingPosts.flatMap((cp) =>
      cp.post.PostPlatform.map((pp) => ({ platform: pp.platform, content: pp.content }))
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (event: string, data: Record<string, unknown>) => {
          if (req.signal.aborted) return false;
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          try {
            controller.enqueue(encoder.encode(message));
            return true;
          } catch {
            return false;
          }
        };

        try {
          // Send initial event with resuming flag if applicable
          enqueue("init", { resuming: isResuming, campaignId });

          const allResults: Array<{
            phaseId: string;
            phaseName: string;
            platform: string;
            content: string;
            charCount: number;
            postId: string;
            variantIndex: number;
            qualityScore: number;
          }> = [];

          // Track posts generated across phases for narrative continuity
          const continuityPosts: Array<{ platform: string; content: string }> = [...previousPosts];

          // Seed order counters with existing post counts per phase
          const phaseOrderCounters: Record<string, number> = {};
          for (const phase of targetPhases) {
            phaseOrderCounters[phase.id] = await prisma.campaignPost.count({
              where: { campaignId, phaseId: phase.id },
            });
          }

          for (const phase of targetPhases) {
            if (req.signal.aborted) {
              log.warn("api.campaigns.generate.aborted", { campaignId, postsGenerated: allResults.length });
              enqueue("error", {
                error: "Generation interrupted — some posts were created. Re-run to continue from where it left off.",
                partial: true,
                postsGenerated: allResults.length,
              });
              try { controller.close(); } catch { /* already closed */ }
              return;
            }

            if (!enqueue("phase_start", { phaseId: phase.id, phaseName: phase.name })) break;

            try {
          // Generate 2 variants per platform for A/B testing
          const generatedVariants = await generatePhasePostsWithVariants(
            { name: phase.name, phase: phase.phase, description: phase.description },
            brief,
            brandCtx,
            platforms,
            continuityPosts.length > 0 ? continuityPosts : undefined,
            workspaceId,
          );

          for (const gv of generatedVariants) {
                if (req.signal.aborted) {
                  log.warn("api.campaigns.generate.aborted_mid_phase", { campaignId, phaseId: phase.id, postsGenerated: allResults.length });
                  enqueue("error", {
                    error: "Generation interrupted — some posts were created. Re-run to continue from where it left off.",
                    partial: true,
                    postsGenerated: allResults.length,
                  });
                  try { controller.close(); } catch { /* already closed */ }
                  return;
                }

                if (!enqueue("platform_start", { phaseId: phase.id, platform: gv.platform, variantIndex: gv.variantIndex })) break;

                const postId = crypto.randomUUID();
                const campaignPostId = crypto.randomUUID();
                const orderIndex = phaseOrderCounters[phase.id]++;

                await prisma.$transaction(async (tx) => {
                  await tx.post.create({
                    data: {
                      id: postId,
                      workspaceId,
                      content: { text: gv.content },
                      status: "DRAFT",
                      aiGenerated: true,
                      CampaignPost: {
                        create: {
                          id: campaignPostId,
                          campaignId,
                          phaseId: phase.id,
                          order: orderIndex,
                          variantIndex: gv.variantIndex,
                          qualityScore: gv.qualityScore,
                          qualityBreakdown: gv.qualityBreakdown as any,
                        },
                      },
                      PostPlatform: {
                        create: {
                          id: crypto.randomUUID(),
                          platform: gv.platform,
                          content: gv.content,
                          status: "DRAFT",
                          mediaUrls: [],
                        },
                      },
                    },
                  });
                });

                allResults.push({
                  phaseId: phase.id,
                  phaseName: phase.name,
                  platform: gv.platform,
                  content: gv.content,
                  charCount: gv.charCount,
                  postId,
                  variantIndex: gv.variantIndex,
                  qualityScore: gv.qualityScore,
                });

                continuityPosts.push({ platform: gv.platform, content: gv.content });

                enqueue("platform_done", {
                  phaseId: phase.id,
                  platform: gv.platform,
                  content: gv.content,
                  charCount: gv.charCount,
                  postId,
                  variantIndex: gv.variantIndex,
                  qualityScore: gv.qualityScore,
                });
              }

              enqueue("phase_complete", {
                phaseId: phase.id,
                phaseName: phase.name,
                postCount: generatedVariants.length,
              });
            } catch (err) {
              log.error("api.campaigns.generate.phase_error", {
                campaignId,
                phaseId: phase.id,
                error: String(err),
              });
              if (!enqueue("phase_error", {
                phaseId: phase.id,
                phaseName: phase.name,
                error: "Failed to generate posts for this phase",
              })) break;
            }
          }

          if (req.signal.aborted) {
            controller.close();
            return;
          }

          log.info("api.campaigns.generate.complete", {
            campaignId,
            phaseCount: targetPhases.length,
            totalPosts: allResults.length,
          });

          enqueue("complete", {
            campaignId,
            phaseCount: targetPhases.length,
            totalPosts: allResults.length,
            results: allResults.map((r) => ({
              phaseId: r.phaseId,
              platform: r.platform,
              postId: r.postId,
              charCount: r.charCount,
              variantIndex: r.variantIndex,
              qualityScore: r.qualityScore,
            })),
          });

          // Log activity
          if (user.id) {
            await logCampaignActivity(campaignId, user.id, "posts_generated", {
              phaseCount: targetPhases.length,
              totalPosts: allResults.length,
              platforms,
            });
          }

          // Give the stream time to flush the complete event before closing
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          log.error("api.campaigns.generate.stream_error", { error: String(err) });
          enqueue("error", { error: "Generation failed" });
        } finally {
          try {
            controller.close();
          } catch {
            // Controller might already be closed
          }
        }
      },
      async cancel() {
        log.warn("api.campaigns.generate.cancelled_by_client", { campaignId });
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
    log.error("api.campaigns.generate.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
