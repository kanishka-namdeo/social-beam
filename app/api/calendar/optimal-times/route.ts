import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface OptimalTime {
  dayOfWeek: number;
  hour: number;
  label: string;
  reason: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  engagementScore: number;
}

const INDUSTRY_DEFAULTS: Record<string, Array<{ dayOfWeek: number; hour: number; reason: string }>> = {
  linkedin: [
    { dayOfWeek: 2, hour: 8, reason: "Tuesday morning professional peak" },
    { dayOfWeek: 3, hour: 9, reason: "Wednesday mid-morning engagement" },
    { dayOfWeek: 4, hour: 10, reason: "Thursday late morning window" },
    { dayOfWeek: 2, hour: 10, reason: "Tuesday late morning" },
    { dayOfWeek: 3, hour: 8, reason: "Wednesday early morning" },
  ],
  instagram: [
    { dayOfWeek: 2, hour: 13, reason: "Tuesday lunch break browsing" },
    { dayOfWeek: 2, hour: 17, reason: "Tuesday evening wind-down" },
    { dayOfWeek: 3, hour: 12, reason: "Wednesday midday scroll" },
    { dayOfWeek: 3, hour: 19, reason: "Wednesday prime time" },
    { dayOfWeek: 4, hour: 14, reason: "Thursday afternoon engagement" },
  ],
  x: [
    { dayOfWeek: 1, hour: 8, reason: "Monday morning news cycle" },
    { dayOfWeek: 2, hour: 9, reason: "Tuesday mid-morning peak" },
    { dayOfWeek: 3, hour: 10, reason: "Wednesday late morning" },
    { dayOfWeek: 4, hour: 8, reason: "Thursday morning engagement" },
    { dayOfWeek: 5, hour: 11, reason: "Friday pre-lunch window" },
  ],
  tiktok: [
    { dayOfWeek: 2, hour: 14, reason: "Tuesday afternoon peak" },
    { dayOfWeek: 3, hour: 15, reason: "Wednesday mid-afternoon" },
    { dayOfWeek: 4, hour: 16, reason: "Thursday late afternoon" },
    { dayOfWeek: 2, hour: 18, reason: "Tuesday evening prime" },
    { dayOfWeek: 5, hour: 14, reason: "Friday afternoon engagement" },
  ],
  facebook: [
    { dayOfWeek: 3, hour: 11, reason: "Wednesday late morning" },
    { dayOfWeek: 3, hour: 13, reason: "Wednesday lunch break" },
    { dayOfWeek: 4, hour: 13, reason: "Thursday early afternoon" },
    { dayOfWeek: 4, hour: 15, reason: "Thursday mid-afternoon" },
    { dayOfWeek: 5, hour: 12, reason: "Friday midday peak" },
  ],
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    const dateStr = searchParams.get("date");

    if (!platform) {
      return NextResponse.json({ error: "Platform parameter required" }, { status: 400 });
    }

    log.info("api.request.start", {
      method: "GET",
      path: "/api/calendar/optimal-times",
      platform,
      date: dateStr,
    });

    // Fetch analytics snapshots with post data for day/hour analysis
    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        platform,
        post: {
          workspaceId,
        },
        engagementRate: {
          not: null,
        },
      },
      select: {
        engagementRate: true,
        snapshotAt: true,
        likes: true,
        comments: true,
        shares: true,
        impressions: true,
      },
      take: 500,
      orderBy: {
        snapshotAt: "desc",
      },
    });

    let optimalTimes: OptimalTime[];

    if (snapshots.length === 0) {
      // No analytics data - use industry defaults
      log.info("api.optimal-times.fallback", { platform, reason: "no_analytics_data" });
      const defaults = INDUSTRY_DEFAULTS[platform.toLowerCase()] ?? INDUSTRY_DEFAULTS.linkedin;
      optimalTimes = defaults.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        hour: d.hour,
        label: `${DAY_NAMES[d.dayOfWeek].slice(0, 3)} ${formatTime(d.hour)}`,
        reason: d.reason,
        confidence: "LOW" as const,
        engagementScore: 0,
      }));
    } else {
      // Aggregate by day-of-week x hour
      const slotMap = new Map<string, { totalEngagement: number; count: number; dayOfWeek: number; hour: number }>();

      for (const snap of snapshots) {
        const date = snap.snapshotAt;
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const key = `${dayOfWeek}-${hour}`;

        const engagement = snap.engagementRate ?? 0;

        if (!slotMap.has(key)) {
          slotMap.set(key, { totalEngagement: 0, count: 0, dayOfWeek, hour });
        }

        const slot = slotMap.get(key)!;
        slot.totalEngagement += engagement;
        slot.count += 1;
      }

      // Calculate average engagement per slot and sort
      const slotArray = Array.from(slotMap.values())
        .map((slot) => ({
          ...slot,
          avgEngagement: slot.totalEngagement / slot.count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement);

      // Take top 5
      optimalTimes = slotArray.slice(0, 5).map((slot) => {
        let confidence: "HIGH" | "MEDIUM" | "LOW";
        if (slot.count >= 10) {
          confidence = "HIGH";
        } else if (slot.count >= 5) {
          confidence = "MEDIUM";
        } else {
          confidence = "LOW";
        }

        return {
          dayOfWeek: slot.dayOfWeek,
          hour: slot.hour,
          label: `${DAY_NAMES[slot.dayOfWeek].slice(0, 3)} ${formatTime(slot.hour)}`,
          reason: `${slot.count} data point${slot.count !== 1 ? "s" : ""}, ${slot.avgEngagement.toFixed(1)}% avg engagement`,
          confidence,
          engagementScore: slot.avgEngagement,
        };
      });
    }

    log.info("api.request.success", {
      platform,
      snapshotCount: snapshots.length,
      optimalTimesCount: optimalTimes.length,
    });

    return NextResponse.json({ optimalTimes });
  } catch (err) {
    log.error("api.request.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
