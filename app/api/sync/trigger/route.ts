import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { PLATFORM_CAPABILITIES } from '@/lib/sync/platform-capabilities';
import { syncWorkspaceAnalytics } from '@/lib/analytics/sync';
import { syncBrowserPlatform } from '@/lib/sync/browser-sync';
import { JobLogger } from '@/lib/sync/job-logger';
import { runProcess, type ProcessContext } from '@/lib/processes/process-manager';
import { processRegistry } from '@/lib/processes/process-registry';
import type { ActivityType } from '@/app/generated/prisma';

const cooldowns = new Map<string, number>();
const MAX_COOLDOWN_ENTRIES = 1000;

const COOLDOWN_MS = 5 * 60 * 1000;

function cleanupCooldownMap(): void {
  const now = Date.now();
  for (const [key, timestamp] of cooldowns) {
    if (now - timestamp > COOLDOWN_MS) {
      cooldowns.delete(key);
    }
  }
}

setInterval(cleanupCooldownMap, COOLDOWN_MS).unref();

const PLATFORM_ACTIVITY_TYPE: Record<string, ActivityType> = {
  linkedin: 'LINKEDIN_IMPORT',
  instagram: 'ANALYTICS_SYNC',
  facebook: 'ANALYTICS_SYNC',
  x: 'ANALYTICS_SYNC',
  tiktok: 'ANALYTICS_SYNC',
  pinterest: 'ANALYTICS_SYNC',
  threads: 'ANALYTICS_SYNC',
  youtube: 'ANALYTICS_SYNC',
  bluesky: 'ANALYTICS_SYNC',
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info('api.request.start', { method: 'POST', path: '/api/sync/trigger' });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const body = await request.json();
    const { platform } = body;

    if (!platform || typeof platform !== 'string') {
      return NextResponse.json({ error: 'Missing platform parameter' }, { status: 400 });
    }

    const capability = PLATFORM_CAPABILITIES[platform.toLowerCase()];
    if (!capability) {
      return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    if (capability.syncMethod === 'none') {
      return NextResponse.json(
        { error: 'Sync not available for this platform yet' },
        { status: 400 }
      );
    }

    const cooldownKey = `${workspaceId}:${platform}`;
    const lastSync = cooldowns.get(cooldownKey);
    if (lastSync && Date.now() - lastSync < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (Date.now() - lastSync);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: `Sync cooldown active. Try again in ${remainingMinutes} minute(s)` },
        { status: 429 }
      );
    }

    const activityType = PLATFORM_ACTIVITY_TYPE[platform.toLowerCase()] ?? 'ANALYTICS_SYNC';

    if (processRegistry.isRunning(workspaceId, activityType)) {
      return NextResponse.json(
        { error: 'Sync already in progress for this platform' },
        { status: 409 }
      );
    }

    const account = await prisma.connectedAccount.findFirst({
      where: { workspaceId, platform: platform.toLowerCase(), status: 'connected' },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'No connected account found for this platform' },
        { status: 400 }
      );
    }

    if (capability.requiresSessionCookie && !account.sessionCookie) {
      return NextResponse.json(
        { error: 'LinkedIn account missing session cookie. Please reconnect your account.' },
        { status: 400 }
      );
    }

    cooldowns.set(cooldownKey, Date.now());
    
    // Evict oldest entries if map grows too large
    if (cooldowns.size > MAX_COOLDOWN_ENTRIES) {
      cleanupCooldownMap();
    }

    const { processId } = await runProcess(workspaceId, activityType, async (ctx: ProcessContext) => {
      const jobLogger = new JobLogger();

      jobLogger.subscribe((entry) => {
        ctx.log(entry.level, entry.message, entry.data);
      });

      jobLogger.info('Sync started', { platform });
      await ctx.reportProgress(5, 'Preparing sync...');

      if (capability.syncMethod === 'api') {
        jobLogger.info('Using API sync method', { platform });
        await ctx.reportProgress(10, 'Syncing via API...');
        const result = await syncWorkspaceAnalytics(
          workspaceId,
          platform.toLowerCase(),
          account.accessToken,
          account.platformUserId,
          (account.sourcePlatform ?? 'personal') as 'personal' | 'organization'
        );

        jobLogger.info('Sync completed', { postsSynced: result.postsSynced });
        await ctx.reportPostsProcessed(result.postsSynced);
        await ctx.reportProgress(100, `Synced ${result.postsSynced} posts`);
      } else if (capability.syncMethod === 'browser') {
        jobLogger.info('Using browser sync method', { platform });
        await ctx.reportProgress(10, 'Starting browser sync...');
        const result = await syncBrowserPlatform(
          workspaceId,
          platform.toLowerCase(),
          account.platformUserId,
          jobLogger,
          async (phase, postsFound, postsStored) => {
            ctx.throwIfCancelled();
            const progress = phase === 'scraping' ? 30 : 30 + Math.round((postsStored / Math.max(postsFound, 1)) * 70);
            await ctx.reportProgress(progress, phase === 'scraping' ? `Scraping ${platform}...` : `Storing posts (${postsStored}/${postsFound})`);
            await ctx.reportPostsFound(postsFound);
            await ctx.reportPostsProcessed(postsStored);
          }
        );

        if (result.errors.length > 0) {
          jobLogger.warn('Sync completed with errors', { errorCount: result.errors.length, errors: result.errors });
        } else {
          jobLogger.info('Sync completed', { postsSynced: result.postsSynced });
        }
      }

      log.info('api.request.success', { platform });
    });

    return NextResponse.json({
      jobId: processId,
      message: `Sync started for ${platform}`,
    });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode === 409) {
      return NextResponse.json(
        { error: 'Sync already in progress for this platform' },
        { status: 409 }
      );
    }
    logger.error('api.request.error', {
      path: '/api/sync/trigger',
      error: String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
