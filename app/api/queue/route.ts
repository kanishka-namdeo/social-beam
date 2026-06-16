import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const createQueueItemSchema = z.object({
  postId: z.string().optional(),
  sourceType: z.enum(['MANUAL', 'RECYCLE', 'TEMPLATE']).optional().default('MANUAL'),
  recycleInterval: z.number().int().positive().optional(),
  recycleEnabled: z.boolean().optional().default(false),
  maxRecycles: z.number().int().positive().optional(),
  category: z.string().max(100).optional(),
  platforms: z.array(z.string()).optional().default([]),
});

const updateQueueItemSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  recycleInterval: z.number().int().positive().optional(),
  recycleEnabled: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'EXHAUSTED']).optional(),
  category: z.string().max(100).optional(),
  platforms: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const platform = searchParams.get('platform');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where: any = {
    workspaceId: user.workspaceId,
  };

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (platform) {
    where.platforms = {
      array_contains: platform,
    };
  }

  try {
    const queueItems = await prisma.contentQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = queueItems.length > limit;
    const data = hasMore ? queueItems.slice(0, limit) : queueItems;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({
      data,
      nextCursor,
    });
  } catch (error) {
    logger.error('api.queue.list.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createQueueItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      postId,
      sourceType,
      recycleInterval,
      recycleEnabled,
      maxRecycles,
      category,
      platforms,
    } = parsed.data;

    if (postId) {
      const post = await prisma.post.findFirst({
        where: {
          id: postId,
          workspaceId: user.workspaceId,
        },
      });

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    }

    const queueItem = await prisma.contentQueue.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: user.workspaceId,
        postId: postId || null,
        sourceType,
        recycleInterval: recycleInterval || null,
        recycleEnabled,
        maxRecycles: maxRecycles || null,
        category: category || null,
        platforms,
      },
    });

    logger.info('api.queue.create.success', { queueId: queueItem.id });

    return NextResponse.json({ data: queueItem }, { status: 201 });
  } catch (error) {
    logger.error('api.queue.create.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateQueueItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      id,
      recycleInterval,
      recycleEnabled,
      status,
      category,
      platforms,
    } = parsed.data;

    const existing = await prisma.contentQueue.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (recycleInterval !== undefined) updateData.recycleInterval = recycleInterval;
    if (recycleEnabled !== undefined) updateData.recycleEnabled = recycleEnabled;
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;
    if (platforms !== undefined) updateData.platforms = platforms;

    const updated = await prisma.contentQueue.update({
      where: { id },
      data: updateData,
    });

    logger.info('api.queue.update.success', { queueId: id });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('api.queue.update.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.contentQueue.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    await prisma.contentQueue.delete({
      where: { id },
    });

    logger.info('api.queue.delete.success', { queueId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api.queue.delete.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
