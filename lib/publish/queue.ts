import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { DuePost } from '@/lib/publish/types';

/**
 * Fetch posts that are scheduled and their scheduledAt time has passed.
 * Returns posts with status 'SCHEDULED' where scheduledAt <= now.
 */
export async function fetchDuePosts(): Promise<DuePost[]> {
  const now = new Date();
  logger.debug('publish.queue.fetch_due', { now: now.toISOString() });

  const posts = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: {
      id: true,
      workspaceId: true,
      scheduledAt: true,
      platforms: {
        where: { status: 'SCHEDULED' },
        select: {
          id: true,
          platform: true,
          content: true,
          mediaUrls: true,
        },
      },
    },
  });

  logger.info('publish.queue.fetched', { count: posts.length });

  return posts.map(post => ({
    id: post.id,
    workspaceId: post.workspaceId,
    scheduledAt: post.scheduledAt!,
    platforms: post.platforms.map(p => ({
      platformId: p.id,
      platform: p.platform as DuePost['platforms'][number]['platform'],
      content: p.content,
      mediaUrls: (p.mediaUrls as string[]) ?? [],
    })),
  }));
}

/**
 * Mark a post and its platform entries as PUBLISHING.
 */
export async function markPostPublishing(postId: string): Promise<void> {
  logger.debug('publish.queue.mark_publishing', { postId });

  await prisma.$transaction([
    prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    }),
    prisma.postPlatform.updateMany({
      where: { postId, status: { in: ['SCHEDULED', 'DRAFT'] } },
      data: { status: 'PUBLISHING' },
    }),
  ]);
}

/**
 * Mark a specific PostPlatform as PUBLISHED with the external ID.
 */
export async function markPlatformPublished(
  platformId: string,
  externalId: string,
): Promise<void> {
  logger.debug('publish.platform.published', { platformId, externalId });

  await prisma.postPlatform.update({
    where: { id: platformId },
    data: {
      status: 'PUBLISHED',
      externalId,
    },
  });
}

/**
 * Mark a specific PostPlatform as FAILED with the error message.
 */
export async function markPlatformFailed(
  platformId: string,
  error: string,
): Promise<void> {
  logger.debug('publish.platform.failed', { platformId, error });

  await prisma.postPlatform.update({
    where: { id: platformId },
    data: {
      status: 'FAILED',
      error,
    },
  });
}

/**
 * Mark the parent post as PUBLISHED if ALL its platforms are PUBLISHED,
 * or FAILED if ALL platforms failed,
 * or leave as PUBLISHING for partial results.
 */
export async function finalizePostStatus(postId: string): Promise<'PUBLISHED' | 'FAILED' | 'PUBLISHING'> {
  const platforms = await prisma.postPlatform.findMany({
    where: { postId },
    select: { status: true },
  });

  const allPublished = platforms.every(p => p.status === 'PUBLISHED');
  const allFailed = platforms.every(p => p.status === 'FAILED');

  let newStatus: 'PUBLISHED' | 'FAILED' | 'PUBLISHING';

  if (allPublished) {
    newStatus = 'PUBLISHED';
  } else if (allFailed) {
    newStatus = 'FAILED';
  } else {
    newStatus = 'PUBLISHING'; // partial — some succeeded, some failed
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: newStatus,
      publishedAt: newStatus === 'PUBLISHED' ? new Date() : undefined,
    },
  });

  logger.info('publish.post.finalized', { postId, status: newStatus });
  return newStatus;
}

/**
 * Fetch posts that are in FAILED status and have at least one platform
 * that also failed — candidates for retry.
 */
export async function fetchRetryCandidates(): Promise<DuePost[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: { in: ['FAILED', 'PUBLISHING'] },
    },
    select: {
      id: true,
      workspaceId: true,
      scheduledAt: true,
      platforms: {
        where: { status: { in: ['FAILED', 'PUBLISHING'] } },
        select: {
          id: true,
          platform: true,
          content: true,
          mediaUrls: true,
        },
      },
    },
  });

  return posts
    .filter(post => post.platforms.length > 0)
    .map(post => ({
      id: post.id,
      workspaceId: post.workspaceId,
      scheduledAt: post.scheduledAt ?? new Date(),
      platforms: post.platforms.map(p => ({
        platformId: p.id,
        platform: p.platform as DuePost['platforms'][number]['platform'],
        content: p.content,
        mediaUrls: (p.mediaUrls as string[]) ?? [],
      })),
    }));
}
