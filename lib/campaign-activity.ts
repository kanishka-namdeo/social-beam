import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/app/generated/prisma";

export async function logCampaignActivity(
  campaignId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.campaignActivity.create({
      data: {
        id: crypto.randomUUID(),
        campaignId,
        userId,
        action,
        details: (details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.error("campaign.activity.log_failed", {
      campaignId,
      userId,
      action,
      error: String(error),
    });
  }
}
