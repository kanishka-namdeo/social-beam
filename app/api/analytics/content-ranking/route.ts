import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", {
      method: "GET",
      path: "/api/analytics/content-ranking",
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

    // Fetch published AND external posts with their analytics in the last 30 days
    const postsWithAnalytics = await prisma.post.findMany({
      where: {
        workspaceId,
        status: {
          in: ["PUBLISHED", "EXTERNAL"],
        },
        publishedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        isExternal: true,
        aiGenerated: true,
        PostPlatform: {
          select: {
            platform: true,
            postUrl: true,
            content: true,
          },
        },
        AnalyticsSnapshot: {
          select: {
            platform: true,
            likes: true,
            comments: true,
            shares: true,
            impressions: true,
            engagementRate: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    // Flatten: each post+platform combination becomes one entry
    const entries = postsWithAnalytics.flatMap((post) =>
      post.AnalyticsSnapshot.map((analytics) => {
        const totalEng = analytics.likes + analytics.comments + analytics.shares;
        const totalImp = analytics.impressions;
        // For posts with zero impressions (external/scraped), use raw engagement / 1000 as pseudo-rate
        const effectiveRate = totalImp > 0 ? totalEng / totalImp : totalEng / 1000;
        return {
          postId: post.id,
          title: post.title ?? "Untitled",
          platform: analytics.platform,
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          impressions: analytics.impressions,
          engagementRate: effectiveRate,
          publishedAt: post.publishedAt,
          url: post.PostPlatform[0]?.postUrl ?? null,
          isExternal: post.isExternal,
          aiGenerated: post.aiGenerated,
          fullText: post.PostPlatform[0]?.content ?? null,
        };
      })
    );

    // Sort by engagement rate descending
    const sorted = entries.sort(
      (a, b) => b.engagementRate - a.engagementRate
    );

    // Top 20 and bottom 5
    const topPosts = sorted.slice(0, 20);
    const bottomPosts = sorted.length > 20 ? sorted.slice(-5) : [];

    // If there are 20 or fewer posts, bottom should still be the last ones (avoid duplicating top)
    const bottomUnique =
      sorted.length <= 20
        ? []
        : sorted.slice(-5);

    log.info("api.request.success", {
      totalEntries: entries.length,
      topCount: topPosts.length,
      bottomCount: bottomUnique.length,
    });

    return NextResponse.json({
      data: {
        top: topPosts.map((p) => ({
          ...p,
          publishedAt: p.publishedAt?.toISOString() ?? null,
        })),
        bottom: bottomUnique.map((p) => ({
          ...p,
          publishedAt: p.publishedAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/analytics/content-ranking",
      error: String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
