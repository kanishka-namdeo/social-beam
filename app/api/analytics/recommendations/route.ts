import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { requirePremium } from "@/lib/api-guards";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", {
      method: "GET",
      path: "/api/analytics/recommendations",
    });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premiumError = await requirePremium();
    if (premiumError) return premiumError;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceId = (session.user as any).workspaceId as string | undefined;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const { days } = querySchema.parse(Object.fromEntries(searchParams));

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [, analyticsSnapshots] = await Promise.all([
      prisma.post.findMany({
        where: { workspaceId, publishedAt: { gte: since } },
        select: { id: true, publishedAt: true, PostPlatform: { select: { platform: true, status: true } } },
      }),
      prisma.analyticsSnapshot.findMany({
        where: { snapshotAt: { gte: since }, Post: { workspaceId } },
        select: {
          id: true,
          postId: true,
          platform: true,
          likes: true,
          comments: true,
          shares: true,
          impressions: true,
          engagementRate: true,
          snapshotAt: true,
          clicks: true,
          reach: true,
          Post: { select: { publishedAt: true } },
        },
      }),
    ]);

    // Optimal posting time analysis
    const timeSlotMap = new Map<string, { totalEng: number; count: number; totalImp: number }>();

    for (const snap of analyticsSnapshots) {
      const publishedAt = snap.Post?.publishedAt;
      if (!publishedAt) continue;
      const d = new Date(publishedAt);
      const hour = d.getHours();
      const dayOfWeek = d.getDay();
      const key = `${dayOfWeek}-${hour}`;
      const eng = snap.likes + snap.comments + snap.shares;
      if (!timeSlotMap.has(key)) {
        timeSlotMap.set(key, { totalEng: 0, count: 0, totalImp: 0 });
      }
      const slot = timeSlotMap.get(key)!;
      slot.totalEng += eng;
      slot.count += 1;
      slot.totalImp += snap.impressions;
    }

    const optimalTimes = Array.from(timeSlotMap.entries())
      .map(([key, data]) => {
        const [dayStr, hourStr] = key.split("-");
        return {
          dayOfWeek: parseInt(dayStr, 10),
          dayName: DAY_NAMES[parseInt(dayStr, 10)],
          hour: parseInt(hourStr, 10),
          avgEngagement: data.totalEng / data.count,
          avgImpressions: data.totalImp / data.count,
          postCount: data.count,
        };
      })
      .filter((t) => t.postCount >= 2)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    // Platform-specific best times
    const platformTimeMap = new Map<string, Map<string, { totalEng: number; count: number }>>();
    for (const snap of analyticsSnapshots) {
      if (!platformTimeMap.has(snap.platform)) {
        platformTimeMap.set(snap.platform, new Map());
      }
      const pMap = platformTimeMap.get(snap.platform)!;
      const publishedAt = snap.Post?.publishedAt;
      if (!publishedAt) continue;
      const hour = new Date(publishedAt).getHours();
      const dayOfWeek = new Date(publishedAt).getDay();
      const key = `${dayOfWeek}-${hour}`;
      if (!pMap.has(key)) {
        pMap.set(key, { totalEng: 0, count: 0 });
      }
      const slot = pMap.get(key)!;
      slot.totalEng += snap.likes + snap.comments + snap.shares;
      slot.count += 1;
    }

    const platformBestTimes: Record<string, Array<{ dayName: string; hour: number; avgEngagement: number }>> = {};
    for (const [platform, pMap] of platformTimeMap) {
      const sorted = Array.from(pMap.entries())
        .map(([key, data]) => {
          const [dayStr, hourStr] = key.split("-");
          return {
            dayName: DAY_NAMES[parseInt(dayStr, 10)],
            hour: parseInt(hourStr, 10),
            avgEngagement: data.totalEng / data.count,
          };
        })
        .filter((t) => t.avgEngagement > 0)
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3);
      if (sorted.length > 0) {
        platformBestTimes[platform] = sorted;
      }
    }

    // Top performing content types (by engagement rate distribution)
    const platformEngagementRates: Record<string, number[]> = {};
    for (const snap of analyticsSnapshots) {
      if (!platformEngagementRates[snap.platform]) platformEngagementRates[snap.platform] = [];
      if (snap.engagementRate != null) platformEngagementRates[snap.platform].push(snap.engagementRate);
    }

    const platformStats = Object.entries(platformEngagementRates).map(([platform, rates]) => ({
      platform,
      avgEngagementRate: rates.length > 0 ? rates.reduce((s, v) => s + v, 0) / rates.length : 0,
      medianEngagementRate: rates.length > 0 ? computeMedian(rates) : 0,
      postCount: rates.length,
    })).sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

    log.info("api.request.success", { recommendationCount: optimalTimes.length + Object.keys(platformBestTimes).length });

    return NextResponse.json({
      data: {
        optimalTimes,
        platformBestTimes,
        platformStats,
        recommendationCount: optimalTimes.length + Object.keys(platformBestTimes).length,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/analytics/recommendations",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
