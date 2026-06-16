import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", {
      method: "GET",
      path: "/api/analytics/overview",
    });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceId = (session.user as any).workspaceId as
      | string
      | undefined;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch analytics snapshots for the workspace in the last 30 days
    // Limit to 1000 records to prevent memory exhaustion on high-volume workspaces
    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        snapshotAt: {
          gte: thirtyDaysAgo,
        },
        post: {
          workspaceId,
        },
      },
      select: {
        platform: true,
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        reach: true,
        clicks: true,
        engagementRate: true,
        snapshotAt: true,
      },
      take: 1000,
      orderBy: {
        snapshotAt: 'desc',
      },
    });

    // Aggregate by day and platform
    const dayMap = new Map<
      string,
      {
        overall: DailyTotals;
        byPlatform: Record<string, DailyTotals>;
      }
    >();

    interface DailyTotals {
      impressions: number;
      engagements: number;
      reach: number;
      clicks: number;
      engagementRateSum: number;
      engagementRateCount: number;
    }

    function emptyTotals(): DailyTotals {
      return {
        impressions: 0,
        engagements: 0,
        reach: 0,
        clicks: 0,
        engagementRateSum: 0,
        engagementRateCount: 0,
      };
    }

    for (const snap of snapshots) {
      const dayKey = snap.snapshotAt.toISOString().split("T")[0];
      const engagements = snap.likes + snap.comments + snap.shares;

      // Overall totals for the day
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          overall: emptyTotals(),
          byPlatform: {},
        });
      }
      const dayEntry = dayMap.get(dayKey)!;

      // Update overall
      dayEntry.overall.impressions += snap.impressions;
      dayEntry.overall.engagements += engagements;
      dayEntry.overall.reach += snap.reach;
      dayEntry.overall.clicks += snap.clicks;
      if (snap.engagementRate != null) {
        dayEntry.overall.engagementRateSum += snap.engagementRate;
        dayEntry.overall.engagementRateCount += 1;
      }

      // Update per-platform
      if (!dayEntry.byPlatform[snap.platform]) {
        dayEntry.byPlatform[snap.platform] = emptyTotals();
      }
      const platformTotals = dayEntry.byPlatform[snap.platform];
      platformTotals.impressions += snap.impressions;
      platformTotals.engagements += engagements;
      platformTotals.reach += snap.reach;
      platformTotals.clicks += snap.clicks;
      if (snap.engagementRate != null) {
        platformTotals.engagementRateSum += snap.engagementRate;
        platformTotals.engagementRateCount += 1;
      }
    }

    // Build time-series array sorted by day
    const timeSeries = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        overall: {
          impressions: data.overall.impressions,
          engagements: data.overall.engagements,
          reach: data.overall.reach,
          clicks: data.overall.clicks,
          engagementRate:
            data.overall.engagementRateCount > 0
              ? data.overall.engagementRateSum / data.overall.engagementRateCount
              : 0,
        },
        byPlatform: Object.fromEntries(
          Object.entries(data.byPlatform).map(([platform, totals]) => [
            platform,
            {
              impressions: totals.impressions,
              engagements: totals.engagements,
              reach: totals.reach,
              clicks: totals.clicks,
              engagementRate:
                totals.engagementRateCount > 0
                  ? totals.engagementRateSum / totals.engagementRateCount
                  : 0,
            },
          ])
        ),
      }));

    // Calculate overall totals across the entire period
    const overallTotals = {
      impressions: 0,
      engagements: 0,
      reach: 0,
      clicks: 0,
      engagementRate: 0,
    };
    for (const entry of timeSeries) {
      overallTotals.impressions += entry.overall.impressions;
      overallTotals.engagements += entry.overall.engagements;
      overallTotals.reach += entry.overall.reach;
      overallTotals.clicks += entry.overall.clicks;
    }
    // Average engagement rate across all days with data
    const daysWithEngagementRate = timeSeries.filter(
      (d) => d.overall.engagementRate > 0
    );
    if (daysWithEngagementRate.length > 0) {
      overallTotals.engagementRate =
        daysWithEngagementRate.reduce(
          (sum, d) => sum + d.overall.engagementRate,
          0
        ) / daysWithEngagementRate.length;
    }

    // Platform totals via SQL aggregation instead of JS loops
    const platformAgg = await prisma.analyticsSnapshot.groupBy({
      by: ["platform"],
      where: {
        snapshotAt: { gte: thirtyDaysAgo },
        post: { workspaceId },
      },
      _sum: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        reach: true,
        clicks: true,
      },
    });

    const platformTotalsResult: Record<
      string,
      { impressions: number; engagements: number; reach: number; clicks: number }
    > = {};
    for (const row of platformAgg) {
      platformTotalsResult[row.platform] = {
        impressions: row._sum.impressions ?? 0,
        engagements:
          (row._sum.likes ?? 0) +
          (row._sum.comments ?? 0) +
          (row._sum.shares ?? 0),
        reach: row._sum.reach ?? 0,
        clicks: row._sum.clicks ?? 0,
      };
    }

    log.info("api.request.success", { snapshotCount: snapshots.length });

    const response = NextResponse.json({
      data: {
        timeSeries,
        overall: overallTotals,
        byPlatform: platformTotalsResult,
      },
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60"
    );

    return response;
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/analytics/overview",
      error: String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
