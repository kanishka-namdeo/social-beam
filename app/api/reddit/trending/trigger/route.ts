import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { logger } from "@/lib/logger";

export async function POST(_req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/trending/trigger" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const configs = await prisma.redditSubredditConfig.findMany({
      where: { workspaceId, isActive: true },
    });

    if (configs.length === 0) {
      return NextResponse.json({
        error: "No active subreddit configs",
        message: "Add subreddits to track before triggering a scrape",
      }, { status: 400 });
    }

    let totalPosts = 0;
    const results: { subreddit: string; postCount: number; status: string }[] = [];

    for (const config of configs) {
      try {
        const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
        if (posts.length > 0) {
          await processAndStoreTrendingPosts(workspaceId, posts);
          totalPosts += posts.length;
          results.push({ subreddit: config.subreddit, postCount: posts.length, status: "success" });
        } else {
          results.push({ subreddit: config.subreddit, postCount: 0, status: "no_posts" });
        }
      } catch (err) {
        logger.error("reddit.trigger.subreddit_error", {
          subreddit: config.subreddit,
          error: String(err),
        });
        results.push({ subreddit: config.subreddit, postCount: 0, status: "error" });
      }
    }

    log.info("api.request.success", { configCount: configs.length, totalPosts });

    return NextResponse.json({
      data: {
        message: `Scraped ${configs.length} subreddits, found ${totalPosts} posts`,
        results,
        totalPosts,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/trending/trigger",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
