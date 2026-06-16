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
import { startActivity, completeActivity, failActivity } from '@/lib/activity-tracker';
import { ActivityType } from '@/app/generated/prisma';
import type { DuePost, PlatformPublishResult } from '@/lib/publish/types';
import { sendPublishNotification } from '@/lib/email/flows/send-publish-notification';
import { addToDLQ } from '@/lib/dead-letter-queue';

type AccountMap = Map<string, { accessToken: string; status: string; tokenExpiry: Date | null }>;

function accountMapKey(workspaceId: string, platform: string): string {
  return `${workspaceId}:${platform}`;
}

/**
 * Publish a single due post to all its target platforms in parallel.
 * Accepts an optional pre-fetched accounts map to avoid N+1 queries.
 */
export async function publishPost(
  post: DuePost,
  accountsMap?: AccountMap,
): Promise<{
  postId: string;
  results: PlatformPublishResult[];
  finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
}> {
  const Sentry = await import('@sentry/nextjs');

  return Sentry.startSpan(
    { name: 'publish.post', op: 'queue.publish', attributes: { 'post.id': post.id, 'post.platform_count': post.platforms.length } },
    async () => publishPostImpl(post, accountsMap),
  );
}

async function publishPostImpl(
  post: DuePost,
  accountsMap?: AccountMap,
): Promise<{
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
        return await publishToPlatform(post, platformTarget, accountsMap);
      } catch (err) {
        logger.error('publish.platform.error', {
          postId: post.id,
          platform: platformTarget.platform,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        const { recordError } = await import('@/lib/error-rate-monitor');
        await recordError(`publish_platform_${platformTarget.platform}`);
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
      platform: 'x',
      success: false,
      error: r.reason instanceof Error ? r.reason.message : 'Unexpected error',
    },
  );

  for (let i = 0; i < post.platforms.length; i++) {
    const platformTarget = post.platforms[i];
    const platformResult = settledResults[i];
    if (!platformResult) continue;

    if (platformResult.success) {
      await markPlatformPublished(platformTarget.platformId, platformResult.externalId ?? '');
    } else {
      await markPlatformFailed(platformTarget.platformId, platformResult.error ?? 'Unknown error');
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

  if (finalStatus === 'FAILED') {
    const platformErrors = settledResults
      .filter(r => !r.success)
      .map(r => `${r.platform}: ${r.error}`)
      .join('; ');

    await addToDLQ({
      entityType: 'post',
      entityId: post.id,
      error: `All platforms failed: ${platformErrors}`,
      metadata: {
        workspaceId: post.workspaceId,
        platforms: settledResults.map(r => r.platform),
        platformErrors,
        finalStatus,
      },
    });
  }

  return { postId: post.id, results: settledResults, finalStatus };
}

/**
 * Publish a single post to a single platform.
 * Accepts an optional pre-fetched accounts map to avoid N+1 queries.
 */
async function publishToPlatform(
  post: DuePost,
  platformTarget: DuePost['platforms'][number],
  accountsMap?: AccountMap,
): Promise<PlatformPublishResult> {
  const Sentry = await import('@sentry/nextjs');

  return Sentry.startSpan(
    { name: `publish.platform.${platformTarget.platform}`, op: 'queue.publish', attributes: { 'post.id': post.id, 'platform': platformTarget.platform } },
    async () => publishToPlatformImpl(post, platformTarget, accountsMap),
  );
}

async function publishToPlatformImpl(
  post: DuePost,
  platformTarget: DuePost['platforms'][number],
  accountsMap?: AccountMap,
): Promise<PlatformPublishResult> {
  logger.debug('publish.platform.start', {
    postId: post.id,
    platform: platformTarget.platform,
  });

  // Get the access token for this workspace/platform combination
  let account: { accessToken: string; status: string; tokenExpiry: Date | null } | null = null;

  if (accountsMap) {
    const key = accountMapKey(post.workspaceId, platformTarget.platform);
    account = accountsMap.get(key) ?? null;
  } else {
    const dbAccount = await prisma.connectedAccount.findUnique({
      where: {
        workspaceId_platform: {
          workspaceId: post.workspaceId,
          platform: platformTarget.platform,
        },
      },
      select: { accessToken: true, status: true, tokenExpiry: true },
    });
    account = dbAccount;
  }

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
  const Sentry = await import('@sentry/nextjs');

  return Sentry.startSpan(
    { name: 'publish.queue.process', op: 'queue.process' },
    async () => processPublishQueueImpl(),
  );
}

async function processPublishQueueImpl(): Promise<{
  processed: number;
  results: Array<{
    postId: string;
    results: PlatformPublishResult[];
    finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
  }>;
}> {
  const { fetchAndLockDuePosts } = await import('@/lib/publish/queue');
  const duePosts = await fetchAndLockDuePosts();

  if (duePosts.length === 0) {
    logger.info('publish.queue.empty');
    return { processed: 0, results: [] };
  }

  logger.info('publish.queue.processing', { count: duePosts.length });

  // Batch-fetch all connected accounts needed for all due posts (fixes N+1)
  const workspaceIds = [...new Set(duePosts.map(p => p.workspaceId))];
  const platforms = [...new Set(duePosts.flatMap(p => p.platforms.map(pt => pt.platform)))];

  const accounts = await prisma.connectedAccount.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      platform: { in: platforms },
      status: 'connected',
    },
    select: {
      workspaceId: true,
      platform: true,
      accessToken: true,
      status: true,
      tokenExpiry: true,
    },
  });

  const accountsMap: AccountMap = new Map();
  for (const account of accounts) {
    const key = accountMapKey(account.workspaceId, account.platform);
    accountsMap.set(key, {
      accessToken: account.accessToken,
      status: account.status,
      tokenExpiry: account.tokenExpiry,
    });
  }

  // Batch-fetch all workspace user data for email notifications (fixes N+1)
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    include: { User: { select: { email: true, name: true } } },
  });

  const workspaceUserMap = new Map(
    workspaces.map(w => [w.id, { email: w.User?.email ?? '', name: w.User?.name ?? '' }])
  );

  // Group posts by workspace
  const postsByWorkspace = new Map<string, DuePost[]>();
  for (const post of duePosts) {
    const existing = postsByWorkspace.get(post.workspaceId) ?? [];
    existing.push(post);
    postsByWorkspace.set(post.workspaceId, existing);
  }

  const allResults: Array<{
    postId: string;
    results: PlatformPublishResult[];
    finalStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';
  }> = [];

  // Process per-workspace with activity tracking
  for (const [workspaceId, workspacePosts] of postsByWorkspace) {
    const logId = await startActivity(workspaceId, ActivityType.PUBLISH_QUEUE, {
      postCount: workspacePosts.length,
    });

    try {
      const results = await Promise.allSettled(
        workspacePosts.map(async (post) => {
          try {
            return await publishPost(post, accountsMap);
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

      const publishedCount = settledResults.filter(r => r.finalStatus === 'PUBLISHED').length;
      const failedCount = settledResults.filter(r => r.finalStatus === 'FAILED').length;

      await completeActivity(logId, {
        publishedCount,
        failedCount,
        postIds: settledResults.map(r => r.postId),
        platformResults: settledResults.flatMap(r =>
          r.results.map(pr => ({
            postId: r.postId,
            platform: pr.platform,
            success: pr.success,
            externalId: pr.externalId,
            error: pr.error,
          })),
        ),
      });

      // Send publish notification email to workspace owner
      try {
        const workspaceUser = workspaceUserMap.get(workspaceId);
        if (workspaceUser?.email) {
          const emailResults = settledResults.map(r => ({
            platforms: r.results.map(res => res.platform),
            status: r.finalStatus as 'PUBLISHED' | 'FAILED',
            error: r.results.find(res => !res.success)?.error,
          }));
          await sendPublishNotification({
            email: workspaceUser.email,
            name: workspaceUser.name,
            publishedCount,
            failedCount,
            results: emailResults,
          });
        }
      } catch (emailError) {
        logger.error('publish.notification_email_error', { workspaceId, error: String(emailError) });
      }

      allResults.push(...settledResults);
    } catch (err) {
      await failActivity(logId, err instanceof Error ? err : String(err), {
        postCount: workspacePosts.length,
      });
      const { recordError, checkErrorRate } = await import('@/lib/error-rate-monitor');
      await recordError('publish_orchestrator');
      await checkErrorRate(10);
    }
  }

  return {
    processed: allResults.length,
    results: allResults,
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
