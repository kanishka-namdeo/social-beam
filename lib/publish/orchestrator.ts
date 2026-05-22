import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  markPostPublishing,
  markPlatformPublished,
  markPlatformFailed,
  finalizePostStatus,
} from '@/lib/publish/queue';
import { createPlatformAdapter } from '@/lib/publish/adapters';
import { decryptToken } from '@/lib/oauth/crypto';
import type { DuePost, PlatformPublishResult } from '@/lib/publish/types';

/**
 * Publish a single due post to all its target platforms in parallel.
 */
export async function publishPost(post: DuePost): Promise<{
  postId: string;
  results: PlatformPublishResult[];
  finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
}> {
  const start = Date.now();
  logger.info('publish.post.start', { postId: post.id, platformCount: post.platforms.length });

  await markPostPublishing(post.id);

  const results = await Promise.allSettled(
    post.platforms.map(async (platformTarget) => {
      try {
        return await publishToPlatform(post, platformTarget);
      } catch (err) {
        logger.error('publish.platform.error', {
          postId: post.id,
          platform: platformTarget.platform,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return {
          platform: platformTarget.platform,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        } satisfies PlatformPublishResult;
      }
    }),
  );

  const settledResults: PlatformPublishResult[] = results.map((r) =>
    r.status === 'fulfilled' ? r.value : {
      platform: 'x', // placeholder
      success: false,
      error: r.reason instanceof Error ? r.reason.message : 'Unexpected error',
    },
  );

  // Update platform statuses
  for (let i = 0; i < post.platforms.length; i++) {
    const platformTarget = post.platforms[i];
    const result = settledResults[i];
    if (!result) continue;

    if (result.success) {
      await markPlatformPublished(platformTarget.platformId, result.externalId ?? '');
    } else {
      await markPlatformFailed(platformTarget.platformId, result.error ?? 'Unknown error');
    }
  }

  const finalStatus = await finalizePostStatus(post.id);

  logger.info('publish.post.complete', {
    postId: post.id,
    duration: Date.now() - start,
    finalStatus,
    successCount: settledResults.filter(r => r.success).length,
    failureCount: settledResults.filter(r => !r.success).length,
  });

  return { postId: post.id, results: settledResults, finalStatus };
}

/**
 * Publish a single post to a single platform.
 */
async function publishToPlatform(
  post: DuePost,
  platformTarget: DuePost['platforms'][number],
): Promise<PlatformPublishResult> {
  logger.debug('publish.platform.start', {
    postId: post.id,
    platform: platformTarget.platform,
  });

  // Get the access token for this workspace/platform combination
  const account = await prisma.connectedAccount.findUnique({
    where: {
      workspaceId_platform: {
        workspaceId: post.workspaceId,
        platform: platformTarget.platform,
      },
    },
  });

  if (!account) {
    throw new Error(`No connected account for ${platformTarget.platform}`);
  }

  if (account.status !== 'connected') {
    throw new Error(`Account not connected: ${platformTarget.platform} (status: ${account.status})`);
  }

  if (account.tokenExpiry && account.tokenExpiry < new Date()) {
    throw new Error(`Token expired for ${platformTarget.platform}`);
  }

  const accessToken = decryptToken(account.accessToken);
  const adapter = await createPlatformAdapter(platformTarget.platform, post.workspaceId);

  const result = await adapter.publish({
    postId: post.id,
    workspaceId: post.workspaceId,
    content: platformTarget.content,
    mediaUrls: platformTarget.mediaUrls,
  }, accessToken);

  logger.info('publish.platform.complete', {
    postId: post.id,
    platform: platformTarget.platform,
    success: result.success,
    externalId: result.externalId,
  });

  return result;
}

/**
 * Process all due posts — fetch from queue and publish each.
 * This is the main entry point for the cron job.
 */
export async function processPublishQueue(): Promise<{
  processed: number;
  results: Array<{
    postId: string;
    results: PlatformPublishResult[];
    finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
  }>;
}> {
  const { fetchDuePosts } = await import('@/lib/publish/queue');
  const duePosts = await fetchDuePosts();

  if (duePosts.length === 0) {
    logger.info('publish.queue.empty');
    return { processed: 0, results: [] };
  }

  logger.info('publish.queue.processing', { count: duePosts.length });

  const results = await Promise.allSettled(
    duePosts.map(async (post) => {
      try {
        return await publishPost(post);
      } catch (err) {
        logger.error('publish.post.error', {
          postId: post.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }),
  );

  const settledResults = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof publishPost>>> => r.status === 'fulfilled')
    .map(r => r.value);

  return {
    processed: settledResults.length,
    results: settledResults,
  };
}

/**
 * Retry failed publishes for a specific post.
 */
export async function retryPost(post: DuePost): Promise<{
  postId: string;
  results: PlatformPublishResult[];
  finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
}> {
  logger.info('publish.post.retry', { postId: post.id });

  // Reset platform statuses to PUBLISHING for retry
  await prisma.postPlatform.updateMany({
    where: {
      postId: post.id,
      status: { in: ['FAILED', 'PUBLISHING'] },
    },
    data: { status: 'PUBLISHING', error: null },
  });

  await prisma.post.update({
    where: { id: post.id },
    data: { status: 'PUBLISHING' },
  });

  return publishPost(post);
}
