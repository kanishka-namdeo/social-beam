import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';
import { fetchPostAnalytics } from './linkedin';
import { scrapeEnhancedPostAnalyticsForUser, scrapeEnhancedPostAnalytics } from '@/lib/linkedin/browser';
import { importLinkedinPosts } from './linkedin-import';
import { importInstagramPosts } from './instagram';
import { importFacebookPosts } from './facebook';
import { importXTweets } from './x';
import { startActivity, completeActivity, failActivity } from '@/lib/activity-tracker';
import { ActivityType } from '@/app/generated/prisma';
import {
  linkedinCircuitBreaker,
  instagramCircuitBreaker,
  facebookCircuitBreaker,
  xCircuitBreaker,
  CircuitBreakerOpenError,
} from '@/lib/circuit-breaker';

export interface SyncAnalyticsResult {
  workspaceId: string;
  platform: string;
  postsSynced: number;
  snapshotsCreated: number;
  errors: string[];
}

/**
 * Sync analytics for all connected accounts across all platforms.
 * This should be called by the cron job on a regular schedule.
 */
export async function syncAllAnalytics(): Promise<SyncAnalyticsResult[]> {
  const Sentry = await import('@sentry/nextjs');

  return Sentry.startSpan(
    { name: 'analytics.sync.all', op: 'analytics.sync' },
    async () => syncAllAnalyticsImpl(),
  );
}

async function syncAllAnalyticsImpl(): Promise<SyncAnalyticsResult[]> {
  const results: SyncAnalyticsResult[] = [];

  const connectedAccounts = await prisma.connectedAccount.findMany({
    where: { status: 'connected' },
    include: { Workspace: true },
  });

  logger.info('analytics.sync.start', { accountCount: connectedAccounts.length });

  // Group accounts by workspace
  const accountsByWorkspace = new Map<string, typeof connectedAccounts>();
  for (const account of connectedAccounts) {
    const existing = accountsByWorkspace.get(account.workspaceId) ?? [];
    existing.push(account);
    accountsByWorkspace.set(account.workspaceId, existing);
  }

  // Process per-workspace with activity tracking
  for (const [workspaceId, workspaceAccounts] of accountsByWorkspace) {
    const platforms = [...new Set(workspaceAccounts.map(a => a.platform))];
    const dateRange = { from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() };
    const logId = await startActivity(workspaceId, ActivityType.ANALYTICS_SYNC, {
      platformCount: platforms.length,
      platforms,
      accountCount: workspaceAccounts.length,
      dateRange,
    });

    const workspaceResults: SyncAnalyticsResult[] = [];
    let totalPostsSynced = 0;
    let totalSnapshotsCreated = 0;

    try {
      // Deduplicate by workspace+platform to avoid N+1 queries when
      // multiple accounts share the same platform in a workspace
      const seenPlatform = new Set<string>();
      for (const account of workspaceAccounts) {
        const platformKey = `${account.workspaceId}:${account.platform}`;
        if (seenPlatform.has(platformKey)) {
          logger.debug('analytics.sync.skip_duplicate_platform', {
            workspaceId: account.workspaceId,
            platform: account.platform,
          });
          continue;
        }
        seenPlatform.add(platformKey);

        try {
          const circuitBreakers: Record<string, typeof linkedinCircuitBreaker> = {
            linkedin: linkedinCircuitBreaker,
            instagram: instagramCircuitBreaker,
            facebook: facebookCircuitBreaker,
            x: xCircuitBreaker,
            twitter: xCircuitBreaker,
          };

          const cb = circuitBreakers[account.platform.toLowerCase()];

          if (cb && await cb.isOpen()) {
            logger.warn('analytics.sync.circuit_open', {
              workspaceId: account.workspaceId,
              platform: account.platform,
            });
            workspaceResults.push({
              workspaceId: account.workspaceId,
              platform: account.platform,
              postsSynced: 0,
              snapshotsCreated: 0,
              errors: [`Circuit breaker open for ${account.platform}`],
            });
            continue;
          }

          const result = await syncWorkspaceAnalytics(
            account.workspaceId,
            account.platform,
            account.accessToken,
            account.platformUserId,
            (account.sourcePlatform ?? 'personal') as 'personal' | 'organization',
          );
          workspaceResults.push(result);
          totalPostsSynced += result.postsSynced;
          totalSnapshotsCreated += result.snapshotsCreated;

          if (cb && result.errors.length > 0) {
            await cb.recordFailure();
          } else if (cb) {
            await cb.recordSuccess();
          }
        } catch (error) {
          if (error instanceof CircuitBreakerOpenError) {
            workspaceResults.push({
              workspaceId: account.workspaceId,
              platform: account.platform,
              postsSynced: 0,
              snapshotsCreated: 0,
              errors: [(error as CircuitBreakerOpenError).message],
            });
          } else {
            logger.error('analytics.sync.workspace_error', {
              workspaceId: account.workspaceId,
              platform: account.platform,
              error: String(error),
            });
            workspaceResults.push({
              workspaceId: account.workspaceId,
              platform: account.platform,
              postsSynced: 0,
              snapshotsCreated: 0,
              errors: [`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            });

            const circuitBreakers: Record<string, typeof linkedinCircuitBreaker> = {
              linkedin: linkedinCircuitBreaker,
              instagram: instagramCircuitBreaker,
              facebook: facebookCircuitBreaker,
              x: xCircuitBreaker,
              twitter: xCircuitBreaker,
            };
            const cb = circuitBreakers[account.platform.toLowerCase()];
            if (cb) {
              await cb.recordFailure();
            }
          }
        }
      }

      await completeActivity(logId, {
        platformsSynced: platforms.length,
        postsSynced: totalPostsSynced,
        snapshotsCreated: totalSnapshotsCreated,
        dateRange,
        perPlatform: workspaceResults.map(r => ({
          platform: r.platform,
          postsSynced: r.postsSynced,
          snapshotsCreated: r.snapshotsCreated,
          errors: r.errors.length,
        })),
      });
    } catch (err) {
      await failActivity(logId, err instanceof Error ? err : String(err), {
        platformsSynced: platforms.length,
        postsSynced: totalPostsSynced,
        dateRange,
      });
    }

    results.push(...workspaceResults);
  }

  logger.info('analytics.sync.complete', { workspaceCount: accountsByWorkspace.size });
  return results;
}

/**
 * Sync analytics for a specific workspace and platform.
 * Handles both app-published posts (via existing sync) and external posts (via import modules).
 */
export async function syncWorkspaceAnalytics(
  workspaceId: string,
  platform: string,
  encryptedAccessToken: string,
  platformUserId: string,
  sourcePlatform: 'personal' | 'organization' = 'personal',
): Promise<SyncAnalyticsResult> {
  const result: SyncAnalyticsResult = {
    workspaceId,
    platform,
    postsSynced: 0,
    snapshotsCreated: 0,
    errors: [],
  };

  let accessToken: string;
  try {
    accessToken = decryptToken(encryptedAccessToken);
  } catch (error) {
    result.errors.push(`Token decrypt failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return result;
  }

  // Route to platform-specific sync logic
  switch (platform.toLowerCase()) {
    case 'linkedin':
      // Sync analytics for app-published posts (existing)
      const linkedinResult = await syncLinkedinAnalytics(workspaceId, accessToken);
      const linkedinImportResult = await importLinkedinPosts(workspaceId, encryptedAccessToken, platformUserId, sourcePlatform);
      result.postsSynced = linkedinResult.postsSynced + linkedinImportResult.postsSynced;
      result.snapshotsCreated = linkedinResult.snapshotsCreated + linkedinImportResult.snapshotsCreated;
      result.errors = [...linkedinResult.errors, ...linkedinImportResult.errors];
      return result;
    case 'instagram':
      const igResult = await importInstagramPosts(workspaceId, encryptedAccessToken, platformUserId);
      result.postsSynced = igResult.postsSynced;
      result.snapshotsCreated = igResult.snapshotsCreated;
      result.errors = igResult.errors;
      return result;
    case 'facebook':
      const fbResult = await importFacebookPosts(workspaceId, encryptedAccessToken, platformUserId);
      result.postsSynced = fbResult.postsSynced;
      result.snapshotsCreated = fbResult.snapshotsCreated;
      result.errors = fbResult.errors;
      return result;
    case 'x':
    case 'twitter':
      const xResult = await importXTweets(workspaceId, encryptedAccessToken, platformUserId);
      result.postsSynced = xResult.postsSynced;
      result.snapshotsCreated = xResult.snapshotsCreated;
      result.errors = xResult.errors;
      return result;
    default:
      logger.debug('analytics.sync.platform_not_supported', { platform });
      return result;
  }
}

/**
 * Sync LinkedIn analytics for all published posts in a workspace.
 */
async function syncLinkedinAnalytics(
  workspaceId: string,
  accessToken: string,
): Promise<SyncAnalyticsResult> {
  const result: SyncAnalyticsResult = {
    workspaceId,
    platform: 'linkedin',
    postsSynced: 0,
    snapshotsCreated: 0,
    errors: [],
  };

  // Get all LinkedIn posts for this workspace (published + external scraped posts)
  const posts = await prisma.post.findMany({
    where: {
      workspaceId,
      PostPlatform: {
        some: {
          platform: 'linkedin',
          externalId: { not: null },
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'linkedin' },
      },
    },
  });

  logger.info('analytics.linkedin.sync.start', { workspaceId, postCount: posts.length });

  // Only sync posts published in the last 90 days (reasonable window for API calls)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentPosts = posts.filter(p => p.publishedAt && p.publishedAt >= ninetyDaysAgo);

  for (const post of recentPosts) {
    const linkedinPlatform = post.PostPlatform.find(pp => pp.platform === 'linkedin');
    if (!linkedinPlatform?.externalId) {
      continue;
    }

    try {
      const shareUrn = `urn:li:share:${linkedinPlatform.externalId}`;
      
      // Use stored analyticsUrl directly when available — this skips re-scraping
      // the public post and goes straight to the analytics dashboard page
      let analytics: Awaited<ReturnType<typeof scrapeEnhancedPostAnalyticsForUser>> | null = null;
      
      if (linkedinPlatform.analyticsUrl) {
        analytics = await scrapeEnhancedPostAnalyticsForUser(workspaceId, linkedinPlatform.analyticsUrl);
      }
      
      // Fallback to global cookie enhanced scraper
      if (!analytics && linkedinPlatform.analyticsUrl) {
        analytics = await scrapeEnhancedPostAnalytics(linkedinPlatform.analyticsUrl);
      }
      
      // Fallback to scraping from the public post URL (for posts without analyticsUrl)
      if (!analytics) {
        const postUrl = linkedinPlatform.postUrl ?? `https://www.linkedin.com/feed/update/${encodeURIComponent(shareUrn)}`;
        analytics = await scrapeEnhancedPostAnalyticsForUser(workspaceId, postUrl);
      }

      // Final fallback to basic scraper
      if (!analytics) {
        const basicAnalytics = await fetchPostAnalytics(shareUrn, accessToken);
        if (!basicAnalytics) {
          continue;
        }
        analytics = {
          ...basicAnalytics,
          impressions: 0,
          uniqueImpressions: 0,
          clicks: 0,
          engagementRate: 0,
          saves: 0,
          profileViews: 0,
          followersGained: 0,
        };
      }

      // Write analytics snapshot to the database
      const snapshot = await prisma.analyticsSnapshot.create({
        data: {
          id: crypto.randomUUID(),
          postId: post.id,
          platform: 'linkedin',
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          impressions: analytics.impressions,
          reach: analytics.uniqueImpressions || analytics.impressions, // Prefer unique if available
          clicks: analytics.clicks,
          engagementRate: analytics.engagementRate,
          profileVisits: analytics.profileViews,
          saves: analytics.saves,
          snapshotAt: new Date(),
        },
      });

      result.postsSynced += 1;
      result.snapshotsCreated += 1;

      logger.debug('analytics.linkedin.snapshot_created', {
        postId: post.id,
        snapshotId: snapshot.id,
        impressions: analytics.impressions,
        engagementRate: analytics.engagementRate,
        engagements: analytics.likes + analytics.comments + analytics.shares,
        source: linkedinPlatform.analyticsUrl ? 'stored_analytics_url' : 'fallback',
      });
    } catch (error) {
      const errorMsg = `Post ${post.id} sync failed: ${error instanceof Error ? error.message : 'Unknown'}`;
      result.errors.push(errorMsg);
      logger.error('analytics.linkedin.post_sync_error', { postId: post.id, error: String(error) });
    }
  }

  logger.info('analytics.linkedin.sync.complete', {
    workspaceId,
    postsSynced: result.postsSynced,
    snapshotsCreated: result.snapshotsCreated,
    errorCount: result.errors.length,
  });

  return result;
}
