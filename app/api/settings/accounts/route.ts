import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
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

    const accounts = await prisma.connectedAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        platform: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    log.info('settings.accounts.list.success', { workspaceId, count: accounts.length });
    return NextResponse.json({ data: accounts });
  } catch (err) {
    logger.error('settings.accounts.list.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to list connected accounts' }, { status: 500 });
  }
}
