import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", {
      method: "GET",
      path: "/api/analytics/performance",
    });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceId = (session.user as any).workspaceId as string | undefined;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const { days } = querySchema.parse(Object.fromEntries(searchParams));

    const since = new Date();
    since.setDate(since.getDate() - days);

    const posts = await prisma.post.findMany({
      where: {
        workspaceId,
        publishedAt: { gte: since },
      },
      select: {
        id: true,
        title: true,
        confidence: true,
        publishedAt: true,
        PostPlatform: {
          select: {
            platform: true,
            status: true,
          },
        },
        AnalyticsSnapshot: {
          select: {
            platform: true,
            likes: true,
            comments: true,
            shares: true,
            impressions: true,
            reach: true,
            clicks: true,
            saves: true,
            videoViews: true,
            profileVisits: true,
            websiteClicks: true,
            engagementRate: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    // Confidence vs actual performance
    const confidenceGroups: Record<string, { totalEngagements: number; totalImpressions: number; count: number; avgEngagementRate: number }> = {};

    for (const post of posts) {
      const conf = post.confidence ?? "UNKNOWN";
      if (!confidenceGroups[conf]) {
        confidenceGroups[conf] = { totalEngagements: 0, totalImpressions: 0, count: 0, avgEngagementRate: 0 };
      }
      const group = confidenceGroups[conf];
      const engSum = post.AnalyticsSnapshot.reduce((s, a) => s + a.likes + a.comments + a.shares, 0);
      const impSum = post.AnalyticsSnapshot.reduce((s, a) => s + a.impressions, 0);
      group.totalEngagements += engSum;
      group.totalImpressions += impSum;
      group.count += 1;
      group.avgEngagementRate += post.AnalyticsSnapshot.reduce((s, a) => s + (a.engagementRate ?? 0), 0);
    }

    const confidenceCorrelation = Object.entries(confidenceGroups).map(([level, data]) => ({
      level,
      count: data.count,
      avgEngagementRate: data.count > 0 ? data.avgEngagementRate / data.count : 0,
      totalEngagements: data.totalEngagements,
      totalImpressions: data.totalImpressions,
    }));

    // Publishing reliability
    const platformPublishStats: Record<string, { total: number; published: number; failed: number; drafting: number }> = {};
    for (const post of posts) {
      for (const pp of post.PostPlatform) {
        if (!platformPublishStats[pp.platform]) {
          platformPublishStats[pp.platform] = { total: 0, published: 0, failed: 0, drafting: 0 };
        }
        platformPublishStats[pp.platform].total += 1;
        if (pp.status === "PUBLISHED") platformPublishStats[pp.platform].published += 1;
        else if (pp.status === "FAILED") platformPublishStats[pp.platform].failed += 1;
        else platformPublishStats[pp.platform].drafting += 1;
      }
    }

    const publishingReliability = Object.entries(platformPublishStats).map(([platform, stats]) => ({
      platform,
      total: stats.total,
      published: stats.published,
      failed: stats.failed,
      drafting: stats.drafting,
      successRate: stats.total > 0 ? stats.published / stats.total : 0,
      failRate: stats.total > 0 ? stats.failed / stats.total : 0,
    }));

    // Overall success rate
    const totalPublished = posts.reduce((s, p) => s + p.PostPlatform.filter((pp) => pp.status === "PUBLISHED").length, 0);
    const totalFailed = posts.reduce((s, p) => s + p.PostPlatform.filter((pp) => pp.status === "FAILED").length, 0);
    const totalPlatforms = posts.reduce((s, p) => s + p.PostPlatform.length, 0);

    // Post frequency & consistency
    const dailyPostCounts: Record<string, number> = {};
    for (const post of posts) {
      if (post.publishedAt) {
        const dayKey = post.publishedAt.toISOString().split("T")[0];
        dailyPostCounts[dayKey] = (dailyPostCounts[dayKey] ?? 0) + 1;
      }
    }

    const allDays: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      allDays.push(d.toISOString().split("T")[0]);
    }

    const postsPerDay = allDays.map((day) => dailyPostCounts[day] ?? 0);
    const avgPostsPerDay = postsPerDay.length > 0 ? postsPerDay.reduce((s, v) => s + v, 0) / postsPerDay.length : 0;
    const currentStreak = computeStreak(allDays, dailyPostCounts);

    // Engagement efficiency per follower
    const followerSnapshots = await prisma.followerSnapshot.groupBy({
      by: ["platform"],
      _max: { followers: true },
      where: { workspaceId },
    });

    const totalFollowers = followerSnapshots.reduce((s, f) => s + (f._max.followers ?? 0), 0);
    const totalAllEngagements = posts.reduce(
      (s, p) => s + p.AnalyticsSnapshot.reduce((es, a) => es + a.likes + a.comments + a.shares, 0),
      0
    );
    const engagementPerFollower = totalFollowers > 0 ? totalAllEngagements / totalFollowers : 0;

    log.info("api.request.success", { postCount: posts.length });

    return NextResponse.json({
      data: {
        confidenceCorrelation,
        publishingReliability,
        overallPublishRate: totalPlatforms > 0 ? totalPublished / totalPlatforms : 0,
        overallFailRate: totalPlatforms > 0 ? totalFailed / totalPlatforms : 0,
        avgPostsPerDay,
        currentStreak,
        engagementPerFollower,
        totalFollowers,
        totalEngagements: totalAllEngagements,
        dailyPostCounts,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/analytics/performance",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function computeStreak(allDays: string[], dailyCounts: Record<string, number>): number {
  let streak = 0;
  for (let i = 0; i < allDays.length; i++) {
    const day = allDays[i];
    if ((dailyCounts[day] ?? 0) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
