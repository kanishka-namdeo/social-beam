import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    const accounts = await prisma.connectedAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        avatarUrl: true,
        status: true,
        lastSyncedAt: true,
        tokenExpiry: true,
        followerCount: true,
        sessionCookie: true,
      },
      orderBy: { lastSyncedAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = accounts.length > limit;
    const data = hasMore ? accounts.slice(0, limit) : accounts;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    const enrichedAccounts = data.map((account) => {
      const isExpired = account.tokenExpiry !== null && account.tokenExpiry < new Date();

      // LinkedIn requires BOTH OAuth token AND session cookie to be considered connected
      const isLinkedInFullyConnected = account.platform === 'linkedin' && !!account.sessionCookie;
      const effectiveStatus = account.platform === 'linkedin' && !isLinkedInFullyConnected && !isExpired
        ? 'pending_session'
        : isExpired
          ? 'expired'
          : account.status;

      return {
        id: account.id,
        platform: account.platform,
        platformUsername: account.platformUsername ?? undefined,
        avatarUrl: account.avatarUrl ?? undefined,
        status: effectiveStatus,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? undefined,
        followerCount: account.followerCount ?? undefined,
        tokenExpiry: account.tokenExpiry ?? undefined,
      };
    });

    log.info('settings.accounts.list.success', { workspaceId, count: enrichedAccounts.length });
    return NextResponse.json({ data: enrichedAccounts, nextCursor });
  } catch (err) {
    logger.error('settings.accounts.list.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to list connected accounts' }, { status: 500 });
  }
}
