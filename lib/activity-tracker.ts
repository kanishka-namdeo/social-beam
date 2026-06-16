import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ActivityType, ActivityStatus } from '@/app/generated/prisma';
import type { Prisma } from '@/app/generated/prisma';

function toJson(data?: Record<string, unknown>): Prisma.NullableJsonNullValueInput | undefined {
  if (!data) return undefined;
  return data as unknown as Prisma.NullableJsonNullValueInput;
}

export async function startActivity(
  workspaceId: string,
  type: ActivityType,
  details?: Record<string, unknown>,
): Promise<string> {
  const logId = crypto.randomUUID();
  const processId = crypto.randomUUID();

  const log = await prisma.activityLog.create({
    data: {
      id: logId,
      workspaceId,
      type,
      status: ActivityStatus.RUNNING,
      details: toJson({ ...details, processId }),
    },
  });

  try {
    await prisma.scraperProcess.create({
      data: {
        id: processId,
        workspaceId,
        type,
        status: 'RUNNING',
        startedAt: new Date(),
        metadata: { activityLogId: logId, source: 'activity-tracker' },
      },
    });
  } catch (err) {
    logger.warn('activity-tracker.scraperProcess.create_failed', { logId, error: String(err) });
  }

  logger.info('activity.started', { logId, processId, workspaceId, type });
  return log.id;
}

export async function completeActivity(
  logId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const existing = await prisma.activityLog.findUnique({ where: { id: logId } });
  if (!existing) {
    logger.warn('activity.completeActivity.not_found', { logId });
    return;
  }

  const mergedDetails = existing.details
    ? { ...(existing.details as Record<string, unknown>), ...(details ?? {}) }
    : details;

  await prisma.$transaction([
    prisma.activityLog.update({
      where: { id: logId },
      data: {
        status: ActivityStatus.COMPLETED,
        finishedAt: new Date(),
        details: toJson(mergedDetails),
      },
    }),
    prisma.scraperProcess.updateMany({
      where: {
        workspaceId: existing.workspaceId,
        type: existing.type,
        status: 'RUNNING',
        metadata: { path: ['activityLogId'], equals: logId },
      },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
      },
    }),
  ]);

  logger.info('activity.completed', { logId });
}

export async function failActivity(
  logId: string,
  error: string | Error,
  details?: Record<string, unknown>,
): Promise<void> {
  const existing = await prisma.activityLog.findUnique({ where: { id: logId } });
  if (!existing) {
    logger.warn('activity.failActivity.not_found', { logId });
    return;
  }

  const errorMessage = error instanceof Error ? error.message : error;
  const mergedDetails = existing.details
    ? { ...(existing.details as Record<string, unknown>), error: errorMessage, ...(details ?? {}) }
    : { error: errorMessage, ...(details ?? {}) };

  await prisma.$transaction([
    prisma.activityLog.update({
      where: { id: logId },
      data: {
        status: ActivityStatus.FAILED,
        finishedAt: new Date(),
        details: mergedDetails,
      },
    }),
    prisma.scraperProcess.updateMany({
      where: {
        workspaceId: existing.workspaceId,
        type: existing.type,
        status: 'RUNNING',
        metadata: { path: ['activityLogId'], equals: logId },
      },
      data: {
        status: 'FAILED',
        error: errorMessage,
        finishedAt: new Date(),
      },
    }),
  ]);

  logger.error('activity.failed', { logId, error: errorMessage });
}

export async function getActiveActivities(
  workspaceId: string,
) {
  return prisma.activityLog.findMany({
    where: {
      workspaceId,
      status: ActivityStatus.RUNNING,
    },
    orderBy: { startedAt: 'asc' },
  });
}

export async function getRecentActivities(
  workspaceId: string,
  limit = 20,
) {
  return prisma.activityLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
