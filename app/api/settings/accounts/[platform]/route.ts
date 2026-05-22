import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await params;
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    await prisma.connectedAccount.delete({
      where: {
        workspaceId_platform: {
          workspaceId,
          platform,
        },
      },
    });

    log.info('settings.account.disconnect.success', { workspaceId, platform });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('settings.account.disconnect.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
