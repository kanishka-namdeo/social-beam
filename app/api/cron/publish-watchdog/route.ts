import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runPublishWatchdog } from '@/lib/publish/watchdog';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn('api.c.publish_watchdog.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    log.info('api.c.publish_watchdog.start');

    const result = await runPublishWatchdog({
      autoRetry: req.headers.get('x-auto-retry') === 'true',
      autoFail: true,
      alertThreshold: 10,
    });

    log.info('api.c.publish_watchdog.complete', {
      stuckCount: result.stuckCount,
      retried: result.retriedPostIds.length,
      failed: result.failedPostIds.length,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    log.error('api.c.publish_watchdog.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
