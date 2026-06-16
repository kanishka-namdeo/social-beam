import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { purgeExpiredCheckpoints } from '@/lib/agent/checkpoint-cleanup';
import { acquireCronLock } from '@/lib/cron-lock';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn('api.c.checkpoint-cleanup.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire DB-backed advisory lock
  const lock = await acquireCronLock('cron:checkpoint-cleanup');
  if (!lock) {
    log.info('api.c.checkpoint-cleanup.already_running');
    return NextResponse.json({ message: 'Already in progress' });
  }

  try {
    log.info('api.c.checkpoint-cleanup.start');

    // Run cleanup with per-agent TTLs from AGENT_TTLS config
    const result = await purgeExpiredCheckpoints();

    log.info('api.c.checkpoint-cleanup.complete', {
      deleted: result.deleted,
      byAgent: result.byAgent,
    });

    return NextResponse.json({
      data: {
        deleted: result.deleted,
        byAgent: result.byAgent,
      },
    });
  } catch (err) {
    log.error('api.c.checkpoint-cleanup.error', { error: String(err) });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  } finally {
    await lock.release();
  }
}
