import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const updateSchema = z.object({
  name: z.string().max(50).optional().or(z.literal('')),
  text: z.string().min(1).max(500).optional(),
  url: z.string().url().optional().or(z.literal('')),
});

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, text, url } = parsed.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name || null;
    if (text !== undefined) updateData.text = stripHtml(text);
    if (url !== undefined) updateData.url = url || null;

    const signature = await prisma.postSignature.update({
      where: { id, workspaceId },
      data: updateData,
    });

    revalidatePath('/dashboard/settings');

    revalidatePath('/dashboard/settings');

    log.info('settings.signatures.update.success', { workspaceId, signatureId: id });
    return NextResponse.json({ signature });
  } catch (err) {
    logger.error('settings.signatures.update.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Wrap default signature update in transaction to prevent race condition
    const signature = await prisma.$transaction(async (tx) => {
      // Clear all defaults first
      await tx.postSignature.updateMany({
        where: { workspaceId },
        data: { isDefault: false },
      });
      // Set the new default
      return tx.postSignature.update({
        where: { id, workspaceId },
        data: { isDefault: true },
      });
    });

    revalidatePath('/dashboard/settings');

    log.info('settings.signatures.set_default.success', { workspaceId, signatureId: id });
    return NextResponse.json({ signature });
  } catch (err) {
    logger.error('settings.signatures.set_default.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to set default signature' }, { status: 500 });
  }
}
