import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId: user.workspaceId },
      select: {
        id: true,
        targetImpressions: true,
        targetEngagementRate: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get all posts in the campaign via CampaignPost join
    const campaignPosts = await prisma.campaignPost.findMany({
      where: { campaignId },
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
                videoViews: true,
                websiteClicks: true,
                profileVisits: true,
              },
            },
          },
        },
      },
    });

    // Aggregate analytics across all campaign posts
    let totalImpressions = 0;
    let totalEngagement = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let totalSaves = 0;
    let totalVideoViews = 0;
    let totalWebsiteClicks = 0;
    let totalProfileVisits = 0;
    let engagementRateSum = 0;
    let engagementRateCount = 0;
    let postsPublished = 0;
    let postsScheduled = 0;

    const topPosts: Array<{
      postId: string;
      title: string | null;
      status: string;
      impressions: number;
      engagement: number;
      engagementRate: number | null;
    }> = [];

    for (const cp of campaignPosts) {
      const post = cp.post;
      const snapshots = post.AnalyticsSnapshot;

      let postImpressions = 0;
      let postLikes = 0;
      let postComments = 0;
      let postShares = 0;
      let postClicks = 0;
      let postReach = 0;
      let postSaves = 0;
      let postVideoViews = 0;
      let postWebsiteClicks = 0;
      let postProfileVisits = 0;
      let postEngagementRate: number | null = null;

      for (const snap of snapshots) {
        postImpressions += snap.impressions;
        postLikes += snap.likes;
        postComments += snap.comments;
        postShares += snap.shares;
        postClicks += snap.clicks;
        postReach += snap.reach;
        postSaves += snap.saves;
        postVideoViews += snap.videoViews;
        postWebsiteClicks += snap.websiteClicks;
        postProfileVisits += snap.profileVisits;

        if (snap.engagementRate !== null) {
          engagementRateSum += snap.engagementRate;
          engagementRateCount++;
          // Keep the highest engagement rate for the post
          if (postEngagementRate === null || snap.engagementRate > postEngagementRate) {
            postEngagementRate = snap.engagementRate;
          }
        }
      }

      const postEngagement = postLikes + postComments + postShares + postClicks;

      totalImpressions += postImpressions;
      totalEngagement += postEngagement;
      totalLikes += postLikes;
      totalComments += postComments;
      totalShares += postShares;
      totalClicks += postClicks;
      totalReach += postReach;
      totalSaves += postSaves;
      totalVideoViews += postVideoViews;
      totalWebsiteClicks += postWebsiteClicks;
      totalProfileVisits += postProfileVisits;

      if (post.status === "PUBLISHED") postsPublished++;
      if (post.status === "SCHEDULED") postsScheduled++;

      topPosts.push({
        postId: post.id,
        title: post.title,
        status: post.status,
        impressions: postImpressions,
        engagement: postEngagement,
        engagementRate: postEngagementRate,
      });
    }

    // Sort top posts by engagement and take top 10
    const topTen = topPosts
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    const avgEngagementRate = engagementRateCount > 0
      ? Math.round((engagementRateSum / engagementRateCount) * 1000) / 1000
      : 0;

    // Calculate goal progress
    const goalProgress: {
      impressionsPercent: number | null;
      engagementRatePercent: number | null;
      impressions?: { current: number; target: number; percentage: number };
      engagementRate?: { current: number; target: number; percentage: number };
    } = {
      impressionsPercent: null,
      engagementRatePercent: null,
    };

    if (campaign.targetImpressions) {
      const percentage = Math.min(100, Math.round((totalImpressions / campaign.targetImpressions) * 100));
      goalProgress.impressionsPercent = percentage;
      goalProgress.impressions = {
        current: totalImpressions,
        target: campaign.targetImpressions,
        percentage,
      };
    }

    if (campaign.targetEngagementRate) {
      const percentage = Math.min(100, Math.round((avgEngagementRate / campaign.targetEngagementRate) * 100));
      goalProgress.engagementRatePercent = percentage;
      goalProgress.engagementRate = {
        current: avgEngagementRate,
        target: campaign.targetEngagementRate,
        percentage,
      };
    }

    log.info("api.campaigns.analytics.success", {
      campaignId,
      totalPosts: campaignPosts.length,
      postsPublished,
      postsScheduled,
    });

    return NextResponse.json({
      data: {
        targetImpressions: campaign.targetImpressions,
        targetEngagementRate: campaign.targetEngagementRate,
        totalImpressions,
        totalEngagement,
        totalLikes,
        totalComments,
        totalShares,
        totalClicks,
        totalReach,
        totalSaves,
        totalVideoViews,
        totalWebsiteClicks,
        totalProfileVisits,
        avgEngagementRate,
        postsPublished,
        postsScheduled,
        topPosts: topTen,
        goalProgress: Object.keys(goalProgress).length > 0 ? goalProgress : undefined,
      },
    });
  } catch (error) {
    log.error("api.campaigns.analytics.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
