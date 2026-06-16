import { NextResponse } from 'next/server';
import { syncAllAnalytics } from '@/lib/analytics/sync';
import { logger } from '@/lib/logger';
import { acquireCronLock } from '@/lib/cron-lock';

/**
 * Scheduled endpoint for automatic analytics sync.
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
  const lock = await acquireCronLock('cron:sync-analytics');
  if (!lock) {
    logger.info('api.cron.sync_analytics.already_running');
    return NextResponse.json({ message: 'Already in progress' });
  }

  try {
    const results = await syncAllAnalytics();

    const totalPostsSynced = results.reduce((sum, r) => sum + r.postsSynced, 0);
    const totalSnapshotsCreated = results.reduce((sum, r) => sum + r.snapshotsCreated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    logger.info('api.cron.sync_analytics', {
      totalPostsSynced,
      totalSnapshotsCreated,
      totalErrors,
      workspaceCount: results.length,
    });

    return NextResponse.json({
      success: true,
      totalPostsSynced,
      totalSnapshotsCreated,
      totalErrors,
      results: results.map(r => ({
        workspaceId: r.workspaceId,
        platform: r.platform,
        postsSynced: r.postsSynced,
        snapshotsCreated: r.snapshotsCreated,
        errors: r.errors,
      })),
    });
  } catch (error) {
    logger.error('api.cron.sync_analytics.error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await lock.release();
  }
}
