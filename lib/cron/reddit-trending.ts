import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { shutdownBrowser } from "@/lib/reddit/cloak";
import { logger } from "@/lib/logger";

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

    for (const config of configs) {
      try {
        const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
        if (posts.length > 0) {
          await processAndStoreTrendingPosts(config.workspaceId, posts, (phase, counts) => {
            logger.info("reddit.cron.progress", {
              subreddit: config.subreddit,
              phase,
              ...counts,
            });
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));
      } catch (err) {
        logger.error("reddit.cron.config_error", {
          subreddit: config.subreddit,
          error: String(err),
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
