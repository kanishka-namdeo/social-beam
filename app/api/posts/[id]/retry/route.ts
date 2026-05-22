import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { retryPost } from '@/lib/publish/orchestrator';
import type { DuePost } from '@/lib/publish/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });
  const { id } = await params;

  try {
    log.info('api.retry.start', { postId: id });

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
        status: true,
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

    if (!post) {
      log.warn('api.retry.not_found', { postId: id });
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.status === 'PUBLISHED') {
      log.warn('api.retry.already_published', { postId: id });
      return NextResponse.json({ error: 'Post already published' }, { status: 400 });
    }

    if (post.platforms.length === 0) {
      log.warn('api.retry.no_failed_platforms', { postId: id });
      return NextResponse.json({ error: 'No failed platforms to retry' }, { status: 400 });
    }

    const duePost: DuePost = {
      id: post.id,
      workspaceId: post.workspaceId,
      scheduledAt: post.scheduledAt ?? new Date(),
      platforms: post.platforms.map(p => ({
        platformId: p.id,
        platform: p.platform as DuePost['platforms'][number]['platform'],
        content: p.content,
        mediaUrls: (p.mediaUrls as string[]) ?? [],
      })),
    };

    const result = await retryPost(duePost);

    log.info('api.retry.complete', {
      postId: id,
      finalStatus: result.finalStatus,
      successCount: result.results.filter(r => r.success).length,
      failureCount: result.results.filter(r => !r.success).length,
    });

    return NextResponse.json({
      data: {
        postId: result.postId,
        finalStatus: result.finalStatus,
        platformResults: result.results.map(r => ({
          platform: r.platform,
          success: r.success,
          externalId: r.externalId,
          externalUrl: r.externalUrl,
          error: r.error,
        })),
      },
    });
  } catch (error) {
    log.error('api.retry.error', { postId: id, error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
