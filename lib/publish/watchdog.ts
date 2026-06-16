import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { alertPublishQueueBacklog } from '@/lib/alerting';
import { addToDLQ } from '@/lib/dead-letter-queue';

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MAX_PUBLISH_RETRIES = 3;

export interface WatchdogResult {
  stuckCount: number;
  stuckPostIds: string[];
  retriedPostIds: string[];
  failedPostIds: string[];
  checkedAt: string;
}

export interface WatchdogOptions {
  autoRetry?: boolean;
  autoFail?: boolean;
  alertThreshold?: number;
}

export async function runPublishWatchdog(
  options: WatchdogOptions = {},
): Promise<WatchdogResult> {
  const { autoRetry = false, autoFail = true, alertThreshold = 10 } = options;
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  logger.info('publish.watchdog.start', { cutoff: cutoff.toISOString() });

  const stuckPosts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHING',
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      workspaceId: true,
      updatedAt: true,
      publishRetryCount: true,
      PostPlatform: {
        where: { status: 'PUBLISHING' },
        select: { id: true, platform: true },
      },
    },
  });

  const stuckPostIds = stuckPosts.map(p => p.id);

  if (stuckPosts.length === 0) {
    logger.info('publish.watchdog.clean');
    return {
      stuckCount: 0,
      stuckPostIds: [],
      retriedPostIds: [],
      failedPostIds: [],
      checkedAt: new Date().toISOString(),
    };
  }

  logger.warn('publish.watchdog.stuck', {
    count: stuckPosts.length,
    postIds: stuckPostIds,
  });

  const retriedPostIds: string[] = [];
  const failedPostIds: string[] = [];

  if (autoRetry) {
    for (const post of stuckPosts) {
      if (post.publishRetryCount >= MAX_PUBLISH_RETRIES) {
        logger.warn('publish.watchdog.max_retries_exceeded', { postId: post.id, retryCount: post.publishRetryCount });
        continue;
      }
      try {
        await prisma.$transaction([
          prisma.post.update({
            where: { id: post.id },
            data: { status: 'SCHEDULED', scheduledAt: new Date(), publishRetryCount: { increment: 1 } },
          }),
          prisma.postPlatform.updateMany({
            where: { postId: post.id, status: 'PUBLISHING' },
            data: { status: 'SCHEDULED' },
          }),
        ]);
        retriedPostIds.push(post.id);
        logger.info('publish.watchdog.retried', { postId: post.id });
      } catch (err) {
        logger.error('publish.watchdog.retry_failed', { postId: post.id, error: String(err) });
      }
    }
  }

  if (autoFail) {
    const remainingIds = stuckPostIds.filter(id => !retriedPostIds.includes(id));
    if (remainingIds.length > 0) {
      try {
        const postsToUpdate = stuckPosts.filter(p => remainingIds.includes(p.id));

        await prisma.$transaction([
          prisma.post.updateMany({
            where: { id: { in: remainingIds } },
            data: { status: 'FAILED' },
          }),
          prisma.postPlatform.updateMany({
            where: {
              postId: { in: remainingIds },
              status: 'PUBLISHING',
            },
            data: {
              status: 'FAILED',
              error: 'Marked FAILED by watchdog: stuck in PUBLISHING >30min',
            },
          }),
        ]);
        failedPostIds.push(...remainingIds);
        logger.info('publish.watchdog.marked_failed', { count: remainingIds.length });

        // Send exhausted posts to dead letter queue
        for (const post of postsToUpdate) {
          if (post.publishRetryCount >= MAX_PUBLISH_RETRIES) {
            await addToDLQ({
              entityType: 'post',
              entityId: post.id,
              error: `Exceeded max publish retries (${MAX_PUBLISH_RETRIES})`,
              maxRetries: 0,
              metadata: {
                workspaceId: post.workspaceId,
                retryCount: post.publishRetryCount,
                reason: 'watchdog_timeout',
              },
            });
          }
        }
      } catch (err) {
        logger.error('publish.watchdog.fail_update_error', { error: String(err) });
      }
    }
  }

  if (stuckPosts.length >= alertThreshold) {
    await alertPublishQueueBacklog(stuckPosts.length, stuckPostIds);
  }

  return {
    stuckCount: stuckPosts.length,
    stuckPostIds,
    retriedPostIds,
    failedPostIds,
    checkedAt: new Date().toISOString(),
  };
}
