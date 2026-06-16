import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { processPublishQueue } from '@/lib/publish/orchestrator';
import { acquireCronLock } from '@/lib/cron-lock';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn('api.c.publish.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire DB-backed advisory lock
  const lock = await acquireCronLock('cron:publish');
  if (!lock) {
    log.info('api.c.publish.already_running');
    return NextResponse.json({ message: 'Already in progress' });
  }

  try {
    log.info('api.c.publish.start');
    const result = await processPublishQueue();
    log.info('api.c.publish.complete', { processed: result.processed });

    return NextResponse.json({
      data: {
        processed: result.processed,
        results: result.results.map(r => ({
          postId: r.postId,
          finalStatus: r.finalStatus,
          platformResults: r.results.map(pr => ({
            platform: pr.platform,
            success: pr.success,
            externalId: pr.externalId,
            error: pr.error,
          })),
        })),
      },
    });
  } catch (error) {
    log.error('api.c.publish.error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  } finally {
    await lock.release();
  }
}
