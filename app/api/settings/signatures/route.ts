import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createSchema = z.object({
  name: z.string().max(50).optional(),
  text: z.string().min(1).max(500),
  url: z.string().url().optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1, 'Signature ID is required'),
});

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const [signatures, workspace] = await Promise.all([
      prisma.postSignature.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'asc' },
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { signatureEnabled: true },
      }),
    ]);

    const hasMore = signatures.length > limit;
    const data = hasMore ? signatures.slice(0, limit) : signatures;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    log.info('settings.signatures.list.success', { workspaceId, count: data.length });
    return NextResponse.json({
      data,
      nextCursor,
      signatureEnabled: workspace?.signatureEnabled ?? true,
    });
  } catch (err) {
    logger.error('settings.signatures.list.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to list signatures' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const isPremiumOrAdmin = userRole === 'PREMIUM_USER' || userRole === 'ADMIN';
    if (!isPremiumOrAdmin) {
      return NextResponse.json({ error: 'Premium or admin required' }, { status: 403 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, text, url, isDefault } = parsed.data;

    const existingCount = await prisma.postSignature.count({ where: { workspaceId } });
    if (existingCount >= 5) {
      return NextResponse.json({ error: 'Maximum 5 signatures allowed' }, { status: 400 });
    }

    const cleanText = stripHtml(text);

    if (isDefault) {
      await prisma.postSignature.updateMany({
        where: { workspaceId },
        data: { isDefault: false },
      });
    }

    const signature = await prisma.postSignature.create({
      data: {
        workspaceId,
        name: name || null,
        text: cleanText,
        url: url || null,
        isDefault: isDefault ?? false,
      },
    });

    revalidatePath('/dashboard/settings');

    revalidatePath('/dashboard/settings');

    log.info('settings.signatures.create.success', { workspaceId, signatureId: signature.id });
    return NextResponse.json({ signature }, { status: 201 });
  } catch (err) {
    logger.error('settings.signatures.create.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const isPremiumOrAdmin = userRole === 'PREMIUM_USER' || userRole === 'ADMIN';
    if (!isPremiumOrAdmin) {
      return NextResponse.json({ error: 'Premium or admin required' }, { status: 403 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    await prisma.postSignature.delete({
      where: { id, workspaceId },
    });

    revalidatePath('/dashboard/settings');

    revalidatePath('/dashboard/settings');

    log.info('settings.signatures.delete.success', { workspaceId, signatureId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('settings.signatures.delete.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
  }
}
