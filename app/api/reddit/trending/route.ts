import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/trending" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const url = new URL(req.url);
    const hoursParam = url.searchParams.get("hours");
    const subredditParam = url.searchParams.get("subreddit");
    const minRelevanceParam = url.searchParams.get("minRelevance");

    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;
    const minRelevance = minRelevanceParam ? parseFloat(minRelevanceParam) : 0;
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const whereClause: Record<string, unknown> = {
      workspaceId,
      scrapedAt: { gte: since },
    };

    if (subredditParam) {
      whereClause.subreddit = subredditParam;
    }

    if (minRelevance > 0) {
      whereClause.relevanceScore = { gte: minRelevance };
    }

    const trendingPosts = await prisma.redditTrendingPost.findMany({
      where: whereClause,
      orderBy: [{ relevanceScore: "desc" as const }, { upvotes: "desc" as const }],
      take: 100,
    });

    const subredditConfigs = await prisma.redditSubredditConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    const postCountsBySubreddit = await prisma.redditTrendingPost.groupBy({
      by: ["subreddit"],
      _count: true,
      _max: { scrapedAt: true },
      where: { workspaceId, scrapedAt: { gte: since } },
    });

    log.info("api.request.success", {
      postCount: trendingPosts.length,
      configCount: subredditConfigs.length,
    });

    return NextResponse.json({
      data: {
        posts: trendingPosts,
        configs: subredditConfigs,
        summary: postCountsBySubreddit,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/trending",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
