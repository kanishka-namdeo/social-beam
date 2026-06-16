/**
 * LinkedIn Scraper Self-Healer Cron Job
 *
 * Runs every 6 hours to proactively check scraper health and fix DOM issues.
 * Pattern: `lib/cron/reddit-trending.ts`
 */
import cron from "node-cron";
import { triggerSelfHealer } from "@/lib/agent/self-healer/trigger";
import { logger } from "@/lib/logger";
import { shutdownBrowser } from "@/lib/linkedin/browser";

type ScheduledTask = ReturnType<typeof cron.schedule>;

let scheduledTask: ScheduledTask | null = null;

export function startLinkedInScraperHealerCron(): void {
  if (scheduledTask) {
    logger.warn("scraper.healer.cron.already_running", { message: "LinkedIn scraper healer cron is already scheduled" });
    return;
  }

  scheduledTask = cron.schedule("0 */6 * * *", async () => {
    logger.info("scraper.healer.cron.triggered");

    try {
      await triggerSelfHealer("all", "default");
    } catch (err) {
      logger.error("scraper.healer.cron.error", { error: String(err) });
    }

    // Clean up browser instances after self-healer completes
    await shutdownBrowser().catch(() => {});

    logger.info("scraper.healer.cron.complete");
  }, {
    timezone: "UTC",
  });

  logger.info("scraper.healer.cron.started", { schedule: "every 6 hours" });
}

export function stopLinkedInScraperHealerCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("scraper.healer.cron.stopped");
  }
}
