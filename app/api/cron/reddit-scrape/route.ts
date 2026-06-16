import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { acquireCronLock } from "@/lib/cron-lock";

const MAX_SUBREDDITS_PER_RUN = 10;
const MIN_SCRAPE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, module: "cron.reddit-scrape" });

  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn("api.cron.reddit_scrape.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acquire DB-backed advisory lock
  const lock = await acquireCronLock("cron:reddit-scrape");
  if (!lock) {
    log.info("api.cron.reddit_scrape.already_running");
    return NextResponse.json({ message: "Scrape already in progress" });
  }

  try {
    log.info("api.cron.reddit_scrape.start");

    // Find all workspaces with active subreddit configs
    const workspaces = await prisma.workspace.findMany({
      where: {
        RedditSubredditConfig: {
          some: { isActive: true },
        },
      },
      select: { id: true },
    });

    if (workspaces.length === 0) {
      log.info("api.cron.reddit_scrape.no_workspaces");
      return NextResponse.json({ message: "No workspaces with active subreddits" });
    }

    const results = [];

    for (const workspace of workspaces) {
      try {
        const result = await scrapeWorkspace(workspace.id, log);
        results.push({ workspaceId: workspace.id, ...result });
      } catch (err) {
        log.error("api.cron.reddit_scrape.workspace_error", {
          workspaceId: workspace.id,
          error: String(err),
        });
        results.push({ workspaceId: workspace.id, error: String(err) });
      }
    }

    log.info("api.cron.reddit_scrape.complete", { workspaceCount: workspaces.length });

    return NextResponse.json({
      message: "Reddit scrape completed",
      workspaces: results,
    });
  } catch (err) {
    log.error("api.cron.reddit_scrape.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await lock.release();
  }
}

async function scrapeWorkspace(
  workspaceId: string,
  log: ReturnType<typeof logger.child>
): Promise<{ subredditsScraped: number; postsFound: number; postsAnalyzed: number; errors: string[] }> {
  // Create scrape log entry
  const scrapeLog = await prisma.redditScrapeLog.create({
    data: {
      workspaceId,
      status: "running",
    },
  });

  const errors: string[] = [];
  let subredditsScraped = 0;
  let postsFound = 0;
  let postsAnalyzed = 0;

  try {
    // Get active subreddit configs
    const configs = await prisma.redditSubredditConfig.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { updatedAt: "asc" }, // Rotate through subreddits
      take: MAX_SUBREDDITS_PER_RUN,
    });

    if (configs.length === 0) {
      await prisma.redditScrapeLog.update({
        where: { id: scrapeLog.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          errors,
        },
      });
      return { subredditsScraped: 0, postsFound: 0, postsAnalyzed: 0, errors };
    }

    // Filter out subreddits scraped recently
    const oneHourAgo = new Date(Date.now() - MIN_SCRAPE_INTERVAL_MS);
    const recentPosts = await prisma.redditTrendingPost.findMany({
      where: {
        workspaceId,
        scrapedAt: { gte: oneHourAgo },
      },
      select: { subreddit: true },
      distinct: ["subreddit"],
    });

    const recentSubreddits = new Set(recentPosts.map((p) => p.subreddit));
    const configsToScrape = configs.filter((c) => !recentSubreddits.has(c.subreddit));

    log.info("api.cron.reddit_scrape.workspace_start", {
      workspaceId,
      totalConfigs: configs.length,
      configsToScrape: configsToScrape.length,
    });

    // Scrape each subreddit
    for (const config of configsToScrape) {
      try {
        const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
        postsFound += posts.length;
        subredditsScraped++;

        if (posts.length > 0) {
          const result = await processAndStoreTrendingPosts(workspaceId, posts);
          postsAnalyzed += result.analyzed;
        }

        log.debug("api.cron.reddit_scrape.subreddit_complete", {
          workspaceId,
          subreddit: config.subreddit,
          postsFound: posts.length,
        });
      } catch (err) {
        const errorMsg = `r/${config.subreddit}: ${String(err)}`;
        errors.push(errorMsg);
        log.error("api.cron.reddit_scrape.subreddit_error", {
          workspaceId,
          subreddit: config.subreddit,
          error: String(err),
        });
      }
    }

    // Update scrape log
    await prisma.redditScrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        completedAt: new Date(),
        subredditsScraped,
        postsFound,
        postsAnalyzed,
        errors,
      },
    });

    log.info("api.cron.reddit_scrape.workspace_complete", {
      workspaceId,
      subredditsScraped,
      postsFound,
      postsAnalyzed,
      errorCount: errors.length,
    });

    return { subredditsScraped, postsFound, postsAnalyzed, errors };
  } catch (err) {
    await prisma.redditScrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errors: [...errors, String(err)],
      },
    });
    throw err;
  }
}
