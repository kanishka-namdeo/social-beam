import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const toggleSchema = z.object({
  signatureEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { signatureEnabled } = parsed.data;

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { signatureEnabled },
    });

    log.info('settings.signatures.toggle.success', { workspaceId, signatureEnabled });
    return NextResponse.json({ success: true, signatureEnabled });
  } catch (err) {
    logger.error('settings.signatures.toggle.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to toggle signature setting' }, { status: 500 });
  }
}
