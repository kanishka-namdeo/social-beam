import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { processPublishQueue } from '@/lib/publish/orchestrator';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  // Protect endpoint with cron secret
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== CRON_SECRET) {
    log.warn('api.c.publish.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  }
}

// Also support GET for easy testing (though POST is the proper method)
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== CRON_SECRET) {
    log.warn('api.c.publish.unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  }
}
