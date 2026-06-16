import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEngagementDigest } from '@/lib/email/flows/send-engagement-digest';
import { acquireCronLock } from '@/lib/cron-lock';

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lock = await acquireCronLock('cron:engagement-digest');
  if (!lock) {
    logger.info('api.cron.engagement_digest.already_running');
    return NextResponse.json({ message: 'Already in progress' });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const engagementCounts = await prisma.engagementItem.groupBy({
      by: ['workspaceId'],
      where: {
        status: 'UNREAD',
        createdAt: { gte: twentyFourHoursAgo },
      },
      _count: {
        id: true,
      },
    });

    if (engagementCounts.length === 0) {
      return NextResponse.json({ success: true, workspacesProcessed: 0 });
    }

    const workspaceIds = engagementCounts.map(row => row.workspaceId);

    const [workspaces, allTypeCounts] = await Promise.all([
      prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: {
          id: true,
          User: {
            select: { email: true, name: true },
          },
        },
      }),
      prisma.engagementItem.groupBy({
        by: ['workspaceId', 'type'],
        where: {
          workspaceId: { in: workspaceIds },
          status: 'UNREAD',
          createdAt: { gte: twentyFourHoursAgo },
        },
        _count: { id: true },
      }),
    ]);

    const workspaceMap = new Map(workspaces.map(w => [w.id, w]));
    const typeCountsMap = new Map<string, Record<string, number>>();
    
    for (const tc of allTypeCounts) {
      if (!typeCountsMap.has(tc.workspaceId)) {
        typeCountsMap.set(tc.workspaceId, {});
      }
      typeCountsMap.get(tc.workspaceId)![tc.type] = tc._count.id;
    }

    let workspacesProcessed = 0;

    for (const row of engagementCounts) {
      const { workspaceId } = row;
      const totalUnread = row._count.id;

      try {
        const workspace = workspaceMap.get(workspaceId);
        if (!workspace?.User?.email) {
          logger.warn('api.cron.engagement_digest.no_user_email', { workspaceId });
          continue;
        }

        const counts = typeCountsMap.get(workspaceId) ?? {};

        await sendEngagementDigest({
          email: workspace.User.email,
          name: workspace.User.name ?? 'there',
          commentCount: counts['COMMENT'] ?? 0,
          mentionCount: counts['MENTION'] ?? 0,
          dmCount: counts['DM'] ?? 0,
          totalUnread,
        });

        workspacesProcessed++;
      } catch (error) {
        logger.error('api.cron.engagement_digest.workspace_error', {
          workspaceId,
          error: String(error),
        });
      }
    }

    logger.info('api.cron.engagement_digest.complete', {
      workspacesProcessed,
      totalWorkspaces: engagementCounts.length,
    });

    return NextResponse.json({
      success: true,
      workspacesProcessed,
    });
  } catch (error) {
    logger.error('api.cron.engagement_digest.error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await lock.release();
  }
}
