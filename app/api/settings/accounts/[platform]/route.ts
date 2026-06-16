import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getScrapedDataCounts, deleteScrapedDataForPlatform } from '@/lib/scraped-data-cleanup';

export async function GET(
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

    const counts = await getScrapedDataCounts(workspaceId, platform);

    log.info('settings.account.scraped-data.counts', { workspaceId, platform, total: counts.total });
    return NextResponse.json({ counts });
  } catch (err) {
    logger.error('settings.account.scraped-data.counts.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to get scraped data counts' }, { status: 500 });
  }
}

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

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { deleteScrapedData } = body;

    if (deleteScrapedData === true) {
      const result = await prisma.$transaction(async (tx) => {
        const deletedData = await deleteScrapedDataForPlatform(workspaceId, platform, tx);
        await tx.connectedAccount.delete({
          where: {
            workspaceId_platform: {
              workspaceId,
              platform,
            },
          },
        });
        return deletedData;
      });

      log.info('settings.account.disconnect.with-cleanup.success', { workspaceId, platform, deletedTotal: result.total });
      return NextResponse.json({ success: true, deletedData: result });
    } else {
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
    }
  } catch (err) {
    logger.error('settings.account.disconnect.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
