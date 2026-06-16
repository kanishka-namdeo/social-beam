import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { shutdownBrowser } from "@/lib/reddit/cloak";
import { logger } from "@/lib/logger";
import { startActivity, completeActivity, failActivity } from "@/lib/activity-tracker";
import { ActivityType } from "@/app/generated/prisma";

type ScheduledTask = ReturnType<typeof cron.schedule>;

let scheduledTask: ScheduledTask | null = null;

export function startRedditTrendingCron(): void {
  if (scheduledTask) {
    logger.warn("reddit.cron.already_running", { message: "Reddit trending cron is already scheduled" });
    return;
  }

  scheduledTask = cron.schedule("0 */2 * * *", async () => {
    logger.info("reddit.cron.triggered");

    const configs = await prisma.redditSubredditConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      logger.debug("reddit.cron.no_configs");
      return;
    }

    logger.info("reddit.cron.processing", { configCount: configs.length });

    // Group configs by workspaceId
    const configsByWorkspace = new Map<string, typeof configs>();
    for (const config of configs) {
      const existing = configsByWorkspace.get(config.workspaceId) ?? [];
      existing.push(config);
      configsByWorkspace.set(config.workspaceId, existing);
    }

    // Process per-workspace with activity tracking
    for (const [workspaceId, workspaceConfigs] of configsByWorkspace) {
      const logId = await startActivity(workspaceId, ActivityType.REDDIT_SCRAPING, {
        subredditCount: workspaceConfigs.length,
        subreddits: workspaceConfigs.map((c) => c.subreddit),
      });

      const subredditResults: Array<{ subreddit: string; postsCount: number; relevantCount?: number; savedCount?: number; status: string }> = [];
      let totalPosts = 0;
      let totalRelevant = 0;
      let totalSaved = 0;

      try {
        for (const config of workspaceConfigs) {
          try {
            const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
            let relevantCount = 0;
            let savedCount = 0;
            if (posts.length > 0) {
              const processingResult = await processAndStoreTrendingPosts(config.workspaceId, posts, (phase, counts) => {
                logger.info("reddit.cron.progress", {
                  subreddit: config.subreddit,
                  phase,
                  ...counts,
                });
              });
              totalPosts += posts.length;
              relevantCount = processingResult.analyzed;
              savedCount = processingResult.total;
              totalRelevant += relevantCount;
              totalSaved += savedCount;
            }
            subredditResults.push({
              subreddit: config.subreddit,
              postsCount: posts.length,
              relevantCount,
              savedCount,
              status: "completed",
            });
            await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));
          } catch (err) {
            logger.error("reddit.cron.config_error", {
              subreddit: config.subreddit,
              error: String(err),
            });
            subredditResults.push({
              subreddit: config.subreddit,
              postsCount: 0,
              status: `error: ${String(err)}`,
            });
          }
        }

        await completeActivity(logId, {
          subreddits: subredditResults,
          totalPosts,
          totalRelevant,
          totalSaved,
          subredditsScraped: subredditResults.length,
          postsFound: totalPosts,
          postsRelevant: totalRelevant,
          postsSaved: totalSaved,
        });
      } catch (err) {
        await failActivity(logId, err instanceof Error ? err : String(err), {
          subreddits: subredditResults,
          totalPosts,
          totalRelevant,
          totalSaved,
          subredditsScraped: subredditResults.length,
        });
      }
    }

    logger.info("reddit.cron.complete");

    await shutdownBrowser().catch(() => {});
  }, {
    timezone: "UTC",
  });

  logger.info("reddit.cron.started", { schedule: "every 2 hours" });
}

export function stopRedditTrendingCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("reddit.cron.stopped");
  }
}
