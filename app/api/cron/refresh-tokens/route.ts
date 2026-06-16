import { NextResponse } from 'next/server';
import { refreshAllDueAccounts } from '@/lib/oauth/token-refresh';
import { logger } from '@/lib/logger';
import { acquireCronLock } from '@/lib/cron-lock';

/**
 * Scheduled endpoint for automatic token refresh.
 * Should be called by an external cron job (e.g., Vercel Cron, GitHub Actions).
 * Protected by a secret header to prevent unauthorized access.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire DB-backed advisory lock
  const lock = await acquireCronLock('cron:refresh-tokens');
  if (!lock) {
    logger.info('api.cron.refresh_tokens.already_running');
    return NextResponse.json({ message: 'Already in progress' });
  }

  try {
    const result = await refreshAllDueAccounts();

    logger.info('api.cron.refresh_tokens', {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    });

    return NextResponse.json({
      success: true,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (error) {
    logger.error('api.cron.refresh_tokens.error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await lock.release();
  }
}
