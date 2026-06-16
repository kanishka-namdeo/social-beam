import { cleanupExpiredDrafts } from "@/lib/db/brand-context";
import { logger } from "@/lib/logger";

export async function runDraftCleanup(): Promise<number> {
  logger.info("cron.draft_cleanup.start");
  try {
    const deletedCount = await cleanupExpiredDrafts();
    logger.info("cron.draft_cleanup.complete", { deletedCount });
    return deletedCount;
  } catch (err) {
    logger.error("cron.draft_cleanup.error", { error: String(err) });
    throw err;
  }
}
