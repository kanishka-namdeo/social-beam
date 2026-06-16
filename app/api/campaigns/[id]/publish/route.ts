import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { logCampaignActivity } from "@/lib/campaign-activity";

const publishSchema = z.object({
  phaseId: z.string().optional(),
  scheduledDates: z.record(z.string(), z.string()).optional(),
});

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

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      select: { id: true, requireApproval: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { phaseId, scheduledDates } = parsed.data;
    const requiresApproval = campaign.requireApproval ?? false;

    log.info("api.campaigns.publish.start", {
      campaignId,
      phaseId: phaseId ?? "all",
      hasScheduledDates: !!scheduledDates,
      requireApproval: requiresApproval,
    });

    // Find all CampaignPost records that are DRAFT for this campaign (and optional phase)
    const whereClause: Record<string, unknown> = {
      campaignId,
      post: {
        status: "DRAFT",
        workspaceId,
      },
    };

    // If approval is required, only publish approved posts
    if (requiresApproval) {
      whereClause.approvalStatus = "approved";
    }

    if (phaseId) {
      whereClause.phaseId = phaseId;
    }

    const draftCampaignPosts = await prisma.campaignPost.findMany({
      where: whereClause,
      include: {
        post: {
          select: {
            id: true,
            title: true,
            PostPlatform: { select: { id: true, platform: true, status: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // Count skipped posts (not approved when approval required)
    let skipped = 0;
    if (requiresApproval) {
      const skippedWhere: Record<string, unknown> = {
        campaignId,
        post: {
          status: "DRAFT",
          workspaceId,
        },
        approvalStatus: { not: "approved" },
      };
      if (phaseId) {
        skippedWhere.phaseId = phaseId;
      }
      skipped = await prisma.campaignPost.count({ where: skippedWhere });
    }

    if (draftCampaignPosts.length === 0) {
      return NextResponse.json({
        data: { published: 0, failed: 0, skipped, results: [] },
      });
    }

    const results: Array<{
      postId: string;
      title: string | null;
      success: boolean;
      error?: string;
      scheduledAt?: string;
      platforms: Array<{ platform: string; status: string }>;
    }> = [];

    let published = 0;
    let failed = 0;

    for (const cp of draftCampaignPosts) {
      try {
        // Determine scheduledAt: use provided date, or default to now
        const scheduledAtStr = scheduledDates?.[cp.post.id];
        const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : new Date();

        if (isNaN(scheduledAt.getTime())) {
          throw new Error(`Invalid date for post ${cp.post.id}: ${scheduledAtStr}`);
        }

        // Wrap post and platform updates in transaction
        await prisma.$transaction([
          prisma.post.update({
            where: { id: cp.post.id },
            data: {
              status: "SCHEDULED",
              scheduledAt,
            },
          }),
          prisma.postPlatform.updateMany({
            where: { postId: cp.post.id },
            data: { status: "SCHEDULED" },
          }),
        ]);

        published++;
        results.push({
          postId: cp.post.id,
          title: cp.post.title,
          success: true,
          scheduledAt: scheduledAt.toISOString(),
          platforms: cp.post.PostPlatform.map((pp) => ({
            platform: pp.platform,
            status: "SCHEDULED",
          })),
        });
      } catch (err) {
        failed++;
        log.error("api.campaigns.publish.post_error", {
          postId: cp.post.id,
          error: String(err),
        });
        results.push({
          postId: cp.post.id,
          title: cp.post.title,
          success: false,
          error: "Failed to schedule post",
          platforms: cp.post.PostPlatform.map((pp) => ({
            platform: pp.platform,
            status: pp.status,
          })),
        });
      }
    }

    log.info("api.campaigns.publish.complete", {
      campaignId,
      published,
      failed,
      skipped,
      total: draftCampaignPosts.length,
    });

    // Log activity
    if (user.id) {
      await logCampaignActivity(campaignId, user.id, "published", {
        published,
        failed,
        skipped,
        phaseId: phaseId ?? "all",
      });
    }

    return NextResponse.json({
      data: { published, failed, skipped, results },
    });
  } catch (error) {
    log.error("api.campaigns.publish.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
