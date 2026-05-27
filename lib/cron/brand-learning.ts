import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { aggregateSignals, initializeFieldStates } from "@/lib/brand/learning-signal-aggregator";
import { logger } from "@/lib/logger";

type ScheduledTask = ReturnType<typeof cron.schedule>;

let scheduledTask: ScheduledTask | null = null;

const SIGNAL_THRESHOLD_FOR_REFRESH = 5;

export function startBrandLearningCron(): void {
  if (scheduledTask) {
    logger.warn("brand_learning.cron.already_running", { message: "Brand learning cron is already scheduled" });
    return;
  }

  scheduledTask = cron.schedule("0 2 * * 0", async () => {
    logger.info("brand_learning.cron.triggered");

    const brandContexts = await prisma.brandContext.findMany({
      where: { trainingStatus: "trained" },
      select: { id: true, workspaceId: true },
    });

    if (brandContexts.length === 0) {
      logger.debug("brand_learning.cron.no_contexts");
      return;
    }

    logger.info("brand_learning.cron.processing", { contextCount: brandContexts.length });

    for (const ctx of brandContexts) {
      try {
        await initializeFieldStates(ctx.id);

        const aggregated = await aggregateSignals(ctx.id);

        if (aggregated.length === 0) {
          logger.debug("brand_learning.cron.no_signals", { brandContextId: ctx.id });
          continue;
        }

        const driftedFields = aggregated.filter(
          (s) => s.signalCount >= SIGNAL_THRESHOLD_FOR_REFRESH,
        );

        if (driftedFields.length > 0) {
          await prisma.brandContext.update({
            where: { id: ctx.id },
            data: { trainingStatus: "needs_refresh" },
          });

          logger.info("brand_learning.cron.drift_detected", {
            brandContextId: ctx.id,
            workspaceId: ctx.workspaceId,
            driftedFields: driftedFields.map((d) => d.fieldName),
          });
        } else {
          logger.info("brand_learning.cron.stable", {
            brandContextId: ctx.id,
            signalGroups: aggregated.length,
          });
        }
      } catch (err) {
        logger.error("brand_learning.cron.context_error", {
          brandContextId: ctx.id,
          error: String(err),
        });
      }
    }

    logger.info("brand_learning.cron.complete");
  }, {
    timezone: "UTC",
  });

  logger.info("brand_learning.cron.started", { schedule: "weekly Sunday 2AM UTC" });
}

export function stopBrandLearningCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("brand_learning.cron.stopped");
  }
}
