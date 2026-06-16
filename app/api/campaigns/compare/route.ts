import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const compareQuerySchema = z.object({
  ids: z.string().min(1),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = compareQuerySchema.safeParse({
      ids: searchParams.get("ids") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const campaignIds = parsed.data.ids.split(",").map((id) => id.trim()).filter(Boolean);

    if (campaignIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 campaign IDs are required for comparison" },
        { status: 400 },
      );
    }

    if (campaignIds.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 campaigns can be compared" },
        { status: 400 },
      );
    }

    // Fetch campaigns with their posts and analytics
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: { in: campaignIds },
        workspaceId: user.workspaceId,
      },
      include: {
        phases: {
          select: { id: true },
        },
        posts: {
          include: {
            post: {
              select: {
                id: true,
                status: true,
                title: true,
                publishedAt: true,
                AnalyticsSnapshot: {
                  select: {
                    likes: true,
                    comments: true,
                    shares: true,
                    impressions: true,
                    engagementRate: true,
                    clicks: true,
                    reach: true,
                    saves: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({ error: "No campaigns found" }, { status: 404 });
    }

    // Process each campaign to calculate aggregated metrics
    const comparisonData = campaigns.map((campaign) => {
      let totalImpressions = 0;
      let totalReach = 0;
      let totalEngagement = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalClicks = 0;
      let totalSaves = 0;
      let engagementRateSum = 0;
      let engagementRateCount = 0;

      let topPost: {
        postId: string;
        title: string | null;
        engagement: number;
      } | null = null;

      for (const cp of campaign.posts) {
        const post = cp.post;
        const snapshots = post.AnalyticsSnapshot;

        let postImpressions = 0;
        let postLikes = 0;
        let postComments = 0;
        let postShares = 0;
        let postClicks = 0;
        let postReach = 0;
        let postSaves = 0;

        for (const snap of snapshots) {
          postImpressions += snap.impressions;
          postLikes += snap.likes;
          postComments += snap.comments;
          postShares += snap.shares;
          postClicks += snap.clicks;
          postReach += snap.reach;
          postSaves += snap.saves;

          if (snap.engagementRate !== null) {
            engagementRateSum += snap.engagementRate;
            engagementRateCount++;
          }
        }

        const postEngagement = postLikes + postComments + postShares + postClicks;

        totalImpressions += postImpressions;
        totalReach += postReach;
        totalEngagement += postEngagement;
        totalLikes += postLikes;
        totalComments += postComments;
        totalShares += postShares;
        totalClicks += postClicks;
        totalSaves += postSaves;

        // Track top post
        if (!topPost || postEngagement > topPost.engagement) {
          topPost = {
            postId: post.id,
            title: post.title,
            engagement: postEngagement,
          };
        }
      }

      const avgEngagementRate = engagementRateCount > 0
        ? Math.round((engagementRateSum / engagementRateCount) * 1000) / 1000
        : 0;

      // Calculate duration in days
      let durationDays: number | null = null;
      if (campaign.startDate && campaign.endDate) {
        const start = new Date(campaign.startDate);
        const end = new Date(campaign.endDate);
        durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        duration: durationDays,
        postCount: campaign.posts.length,
        phaseCount: campaign.phases.length,
        metrics: {
          impressions: totalImpressions,
          reach: totalReach,
          engagement: totalEngagement,
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          clicks: totalClicks,
          saves: totalSaves,
          avgEngagementRate,
        },
        topPost,
      };
    });

    log.info("api.campaigns.compare.success", {
      userId: user.id,
      campaignCount: comparisonData.length,
    });

    return NextResponse.json({ campaigns: comparisonData });
  } catch (error) {
    log.error("api.campaigns.compare.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
