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
        platform: true,
        platformUsername: true,
        avatarUrl: true,
        status: true,
        lastSyncedAt: true,
        tokenExpiry: true,
      },
      orderBy: { lastSyncedAt: 'desc' },
    });

    const enrichedAccounts = accounts.map((account) => {
      const isExpired = account.tokenExpiry !== null && account.tokenExpiry < new Date();
      return {
        platform: account.platform,
        platformUsername: account.platformUsername ?? undefined,
        avatarUrl: account.avatarUrl ?? undefined,
        status: isExpired ? 'expired' : account.status,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? undefined,
      };
    });

    log.info('settings.accounts.list.success', { workspaceId, count: enrichedAccounts.length });
    return NextResponse.json({ accounts: enrichedAccounts });
  } catch (err) {
    logger.error('settings.accounts.list.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to list connected accounts' }, { status: 500 });
  }
}
