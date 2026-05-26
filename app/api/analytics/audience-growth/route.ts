import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", {
      method: "GET",
      path: "/api/analytics/audience-growth",
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
    const now = new Date();

    // Fetch follower snapshots for the last 30 days
    const snapshots = await prisma.followerSnapshot.findMany({
      where: {
        workspaceId,
        snapshotAt: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      orderBy: {
        snapshotAt: "asc",
      },
    });

    // Build time-series per platform
    const platformMap = new Map<string, { date: string; followers: number }[]>();

    for (const snap of snapshots) {
      const dateKey = snap.snapshotAt.toISOString().split("T")[0];
      if (!platformMap.has(snap.platform)) {
        platformMap.set(snap.platform, []);
      }
      const entries = platformMap.get(snap.platform)!;
      // Only keep the latest entry per day (snapshots are ordered asc, so latest overwrites)
      const existingIndex = entries.findIndex((e) => e.date === dateKey);
      if (existingIndex >= 0) {
        entries[existingIndex] = { date: dateKey, followers: snap.followers };
      } else {
        entries.push({ date: dateKey, followers: snap.followers });
      }
    }

    // Sort each platform's entries by date
    const timeSeries: Record<string, { date: string; followers: number }[]> = {};
    for (const [platform, entries] of platformMap) {
      timeSeries[platform] = entries.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Calculate net change per platform
    const netChangeByPlatform: Record<string, { start: number; end: number; netChange: number }> = {};
    let totalNetChange = 0;

    for (const [platform, entries] of Object.entries(timeSeries)) {
      if (entries.length === 0) continue;
      const start = entries[0].followers;
      const end = entries[entries.length - 1].followers;
      const netChange = end - start;
      netChangeByPlatform[platform] = { start, end, netChange };
      totalNetChange += netChange;
    }

    log.info("api.request.success", { snapshotCount: snapshots.length });

    return NextResponse.json({
      data: {
        timeSeries,
        netChangeByPlatform,
        totalNetChange,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/analytics/audience-growth",
      error: String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
