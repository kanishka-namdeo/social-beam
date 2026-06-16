import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';
import { scrapeEnhancedPostAnalyticsForUser, scrapeEnhancedPostAnalytics, scrapeProfileDataForUser, scrapeProfileData, scrapePostAnalytics, scrapePostAnalyticsForUser } from '@/lib/linkedin/browser';
import { scrapeCreatorDashboardForUser, CreatorDashboardPost, TimeRange } from '@/lib/linkedin/creator-analytics-scraper';
import { scrapePosts, type ScrapedPost } from '@/lib/linkedin/post-scraper';
import { extractShareId } from '@/lib/linkedin/scraping-utils';
import { startActivity, completeActivity, failActivity } from '@/lib/activity-tracker';
import { ActivityType } from '@/app/generated/prisma';

export interface ImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

const DEFAULT_TIME_RANGE: TimeRange = "90 days";

/**
 * Import all LinkedIn posts and their analytics for a connected account.
 *
 * Uses a hybrid approach:
 * 1. PRIMARY: Creator Dashboard (/analytics/creator/content/) - text-based extraction, reliable post discovery with metrics
 * 2. FALLBACK: Activity feed scraping - existing method for when Creator Dashboard fails
 *
 * @param timeRange - Time range to use for the Creator Dashboard (default: "90 days")
 */
export async function importLinkedinPosts(
  workspaceId: string,
  _encryptedAccessToken: string,
  platformUserId: string,
  sourcePlatform: 'personal' | 'organization' = 'personal',
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
): Promise<ImportResult> {
  const result: ImportResult = {
    postsSynced: 0,
    snapshotsCreated: 0,
    followerSnapshotCreated: false,
    errors: [],
  };

  const authorUrn = sourcePlatform === 'organization'
    ? `urn:li:organization:${platformUserId}`
    : `urn:li:person:${platformUserId}`;

  logger.info('linkedin.import.start', { workspaceId, authorUrn, sourcePlatform, timeRange });

  // Start activity tracking
  const logId = await startActivity(workspaceId, ActivityType.LINKEDIN_IMPORT, {
    sourcePlatform,
    timeRange,
    platform: 'linkedin',
    authorUrn,
  });

  try {
    try {
      // Step 1: Fetch follower count
      await importFollowerCount(workspaceId, sourcePlatform, authorUrn);
      result.followerSnapshotCreated = true;
    } catch (error) {
      logger.warn('linkedin.import.follower_count_failed', { workspaceId, error: String(error) });
    }

    // Step 2: Try Creator Dashboard first (PRIMARY method) for recent posts with accurate metrics
    let dashboardPosts: CreatorDashboardPost[] = [];
    try {
      logger.info('linkedin.import.creating_dashboard_scrape', { workspaceId, timeRange });
      const dashboardData = await scrapeCreatorDashboardForUser(workspaceId, timeRange);
      if (dashboardData && dashboardData.posts.length > 0) {
        dashboardPosts = dashboardData.posts;
        logger.info('linkedin.import.dashboard_posts_found', { workspaceId, count: dashboardPosts.length, timeRange: dashboardData.timeRange });
      }
    } catch (error) {
      logger.warn('linkedin.import.dashboard_scrape_failed', { workspaceId, error: String(error) });
    }

    // Step 3: Import posts from Creator Dashboard
    const dashboardUrns = new Set<string>();
    if (dashboardPosts.length > 0) {
      for (const dashboardPost of dashboardPosts) {
        try {
          await importDashboardPost(workspaceId, dashboardPost, authorUrn);
          dashboardUrns.add(dashboardPost.urn);
          result.postsSynced += 1;
          result.snapshotsCreated += 1;
        } catch (error) {
          logger.warn('linkedin.import.single_post_failed', {
            workspaceId,
            postUrn: dashboardPost.urn,
            error: String(error),
          });
        }
      }
    }

    // Step 4: Also scrape activity feed for older posts (complementary to Creator Dashboard)
    // This ensures we get posts from the full time range even if Creator Dashboard only shows recent ones
    logger.info('linkedin.import.scraping_activity_feed', { workspaceId });
    try {
      const feedPosts = await scrapePosts(workspaceId, {
        pageUrl: "https://www.linkedin.com/in/me/recent-activity/all/",
        scrollIterations: 20,
        maxPosts: 50,
        timeoutMs: 60000,
        activityPage: true,
      });
      logger.info('linkedin.import.feed_posts_found', { workspaceId, count: feedPosts.length });

      for (const feedPost of feedPosts) {
        // Skip posts already imported from Creator Dashboard
        const feedUrn = feedPost.urn;
        if (dashboardUrns.has(feedUrn)) {
          logger.debug('linkedin.import.skipping_duplicate', { workspaceId, urn: feedUrn });
          continue;
        }

        try {
          await importScrapedPost(workspaceId, feedPost, authorUrn);
          result.postsSynced += 1;
          result.snapshotsCreated += 1;
        } catch (error) {
          logger.warn('linkedin.import.single_post_failed', {
            workspaceId,
            postUrn: feedPost.urn,
            error: String(error),
          });
        }
      }
    } catch (error) {
      const msg = `Failed to scrape feed posts: ${error instanceof Error ? error.message : 'Unknown'}`;
      result.errors.push(msg);
      logger.error('linkedin.import.posts_scrape_failed', { workspaceId, error: String(error) });
    }

    logger.info('linkedin.import.complete', {
      workspaceId,
      postsSynced: result.postsSynced,
      snapshotsCreated: result.snapshotsCreated,
      errorCount: result.errors.length,
    });

    // Complete activity tracking
    await completeActivity(logId, {
      postsImported: result.postsSynced,
      snapshotsCreated: result.snapshotsCreated,
      followerSnapshotCreated: result.followerSnapshotCreated,
      dateRange: timeRange,
      platform: 'linkedin',
      sourcePlatform,
      errors: result.errors.length,
    });

    return result;
  } catch (err) {
    await failActivity(logId, err instanceof Error ? err : String(err), {
      platform: 'linkedin',
      sourcePlatform,
      dateRange: timeRange,
    });
    throw err;
  }
}

/**
 * Import a post discovered via the Creator Dashboard.
 * Uses the impressions/engagements from the dashboard, then enriches with detailed analytics.
 */
async function importDashboardPost(
  workspaceId: string,
  dashboardPost: CreatorDashboardPost,
  authorUrn: string,
): Promise<void> {
  const postUrn = dashboardPost.urn;
  const shareId = extractShareId(postUrn);
  if (!shareId) {
    logger.debug('linkedin.import.invalid_post_id', { postUrn });
    return;
  }

  // Check if we already have a synthetic Post for this externalId
  const existingPost = await prisma.post.findFirst({
    where: {
      workspaceId,
      isExternal: true,
      PostPlatform: {
        some: {
          platform: 'linkedin',
          externalId: shareId,
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'linkedin' },
      },
    },
  });

  let post = existingPost;

  if (!post) {
    // Create synthetic Post record
    const urnParts = postUrn.split(':');
    const created = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title: dashboardPost.textPreview.slice(0, 100) || `LinkedIn post ${shareId}`,
        content: {
          text: dashboardPost.textPreview,
          media: [],
        },
        status: 'EXTERNAL',
        isExternal: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'linkedin',
            content: dashboardPost.textPreview,
            status: 'PUBLISHED',
            externalId: shareId,
            postUrl: dashboardPost.feedUrl
              ? `https://www.linkedin.com${dashboardPost.feedUrl}`
              : `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`,
            analyticsUrl: dashboardPost.analyticsUrl
              ? (dashboardPost.analyticsUrl.startsWith('http')
                  ? dashboardPost.analyticsUrl
                  : `https://www.linkedin.com${dashboardPost.analyticsUrl}`)
              : null,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'linkedin' },
        },
      },
    });
    post = created;
  } else if (dashboardPost.analyticsUrl) {
    // Fill in missing analyticsUrl on existing posts
    const existingPlatform = post.PostPlatform[0];
    if (existingPlatform && !existingPlatform.analyticsUrl) {
      await prisma.postPlatform.update({
        where: { id: existingPlatform.id },
        data: {
          analyticsUrl: dashboardPost.analyticsUrl.startsWith('http')
            ? dashboardPost.analyticsUrl
            : `https://www.linkedin.com${dashboardPost.analyticsUrl}`,
        },
      });
    }
  }

  // Use Creator Dashboard metrics as baseline
  let impressions = dashboardPost.impressions;
  let engagements = dashboardPost.engagements;

  // Try to enrich with detailed analytics from individual post page
  let enhanced: Awaited<ReturnType<typeof scrapeEnhancedPostAnalyticsForUser>> | null = null;
  if (dashboardPost.analyticsUrl) {
    const fullUrl = dashboardPost.analyticsUrl.startsWith('http')
      ? dashboardPost.analyticsUrl
      : `https://www.linkedin.com${dashboardPost.analyticsUrl}`;
    enhanced = await scrapeEnhancedPostAnalyticsForUser(workspaceId, fullUrl);
  }

  // Merge: prefer detailed analytics when available
  if (enhanced && enhanced.impressions > 0) {
    impressions = enhanced.impressions;
  }

  const likes = (enhanced && enhanced.likes > 0) ? enhanced.likes : Math.round(engagements * 0.8);
  const comments = (enhanced && enhanced.comments > 0) ? enhanced.comments : Math.round(engagements * 0.15);
  const shares = (enhanced && enhanced.shares > 0) ? enhanced.shares : Math.round(engagements * 0.05);
  const totalEngagements = likes + comments + shares;
  // Use scraped engagement rate from LinkedIn when available, otherwise calculate it
  const engagementRate = (enhanced && enhanced.engagementRate > 0) ? enhanced.engagementRate : (impressions > 0 ? totalEngagements / impressions : 0);

  // Create analytics snapshot
  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post!.id,
      platform: 'linkedin',
      likes,
      comments,
      shares,
      impressions,
      reach: enhanced?.uniqueImpressions ?? impressions,
      clicks: enhanced?.clicks ?? 0,
      saves: enhanced?.saves ?? 0,
      videoViews: 0,
      profileVisits: enhanced?.profileViews ?? 0,
      websiteClicks: enhanced?.clicks ?? 0,
      engagementRate,
      snapshotAt: new Date(),
    },
  });

  logger.debug('linkedin.import.dashboard_snapshot_created', {
    workspaceId,
    postId: post!.id,
    impressions,
    engagementRate,
    likes,
    comments,
    shares,
    totalEngagements,
    source: enhanced ? 'individual_analytics' : 'creator_dashboard',
  });
}

/**
 * Import a single scraped post with its analytics.
 */
async function importScrapedPost(
  workspaceId: string,
  scrapedPost: ScrapedPost,
  authorUrn: string,
): Promise<void> {
  const postUrn = scrapedPost.urn;
  const shareId = extractShareId(postUrn);
  if (!shareId) {
    logger.debug('linkedin.import.invalid_post_id', { postUrn });
    return;
  }

  // Check if we already have a synthetic Post for this externalId
  const existingPost = await prisma.post.findFirst({
    where: {
      workspaceId,
      isExternal: true,
      PostPlatform: {
        some: {
          platform: 'linkedin',
          externalId: shareId,
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'linkedin' },
      },
    },
  });

  let post = existingPost;

  if (!post) {
    // Create synthetic Post record
    const created = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title: scrapedPost.text.slice(0, 100) || `LinkedIn post ${shareId}`,
        content: {
          text: scrapedPost.text,
          media: [],
        },
        status: 'EXTERNAL',
        isExternal: true,
        publishedAt: scrapedPost.timestamp ?? new Date(),
        updatedAt: new Date(),
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'linkedin',
            content: scrapedPost.text,
            status: 'PUBLISHED',
            externalId: shareId,
            postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(`urn:li:${scrapedPost.urn.split(':').slice(0, 3).join(':')}:${shareId}`)}`,
            analyticsUrl: postUrn.includes('activity')
              ? `https://www.linkedin.com/analytics/post-summary/${encodeURIComponent(postUrn)}/`
              : null,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'linkedin' },
        },
      },
    });
    post = created;
  } else if (postUrn.includes('activity')) {
    // Fill in missing analyticsUrl on existing posts
    const existingPlatform = post.PostPlatform[0];
    if (existingPlatform && !existingPlatform.analyticsUrl) {
      await prisma.postPlatform.update({
        where: { id: existingPlatform.id },
        data: {
          analyticsUrl: `https://www.linkedin.com/analytics/post-summary/${encodeURIComponent(postUrn)}/`,
        },
      });
    }
  }

  // Build the analytics dashboard URL for enhanced scraping
  // The feed/update URL doesn't show analytics; need /analytics/post-summary/
  const analyticsUrl = postUrn.includes('activity')
    ? `https://www.linkedin.com/analytics/post-summary/${encodeURIComponent(postUrn)}/`
    : null;

  // Try enhanced analytics from the analytics dashboard (has impressions, clicks, AND engagement)
  const enhanced = analyticsUrl ? await scrapeEnhancedPostAnalyticsForUser(workspaceId, analyticsUrl) : null;

  // Fallback: scrape basic engagement from the public post URL
  const basic = await scrapePostAnalyticsForUser(workspaceId, scrapedPost.url);

  if (!enhanced && !basic) {
    logger.warn('linkedin.import.analytics_not_available', { postUrn });
    return;
  }

  // Use enhanced data when available, fall back to basic scraper for engagement metrics
  const likes = (enhanced && enhanced.likes > 0) ? enhanced.likes : (basic?.likes ?? 0);
  const comments = (enhanced && enhanced.comments > 0) ? enhanced.comments : (basic?.comments ?? 0);
  const shares = (enhanced && enhanced.shares > 0) ? enhanced.shares : (basic?.shares ?? 0);
  const totalEngagements = likes + comments + shares;
  const impressions = enhanced?.impressions ?? 0;
  const engagementRate = enhanced?.engagementRate ?? 0;

  // Create analytics snapshot with all available data
  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post!.id,
      platform: 'linkedin',
      likes,
      comments,
      shares,
      impressions,
      reach: enhanced?.uniqueImpressions ?? impressions,
      clicks: enhanced?.clicks ?? 0,
      saves: enhanced?.saves ?? 0,
      videoViews: 0,
      profileVisits: enhanced?.profileViews ?? 0,
      websiteClicks: enhanced?.clicks ?? 0,
      engagementRate,
      snapshotAt: new Date(),
    },
  });

  logger.debug('linkedin.import.snapshot_created', {
    workspaceId,
    postId: post!.id,
    impressions,
    engagementRate,
    likes,
    comments,
    shares,
    totalEngagements,
  });
}

/**
 * Import follower count snapshot.
 * Now scrapes from profile page instead of using unavailable API.
 */
async function importFollowerCount(
  workspaceId: string,
  sourcePlatform: 'personal' | 'organization',
  authorUrn: string,
): Promise<void> {
  try {
    // Extract profile URL from author URN
    // For personal: urn:li:person:ABC123 -> need username
    // For org: urn:li:organization:123 -> https://www.linkedin.com/company/123/
    
    let profileUrl: string | null = null;
    
    if (sourcePlatform === 'organization') {
      const orgId = authorUrn.split(':').pop();
      if (orgId) {
        profileUrl = `https://www.linkedin.com/company/${orgId}/`;
      }
    }
    
    if (!profileUrl) {
      // For personal profiles, use a generic profile page URL
      // We'll use the LinkedIn profile page of the current user
      profileUrl = 'https://www.linkedin.com/in/me/';
    }

    // Scrape follower count from profile page
    const profileData = await scrapeProfileDataForUser(workspaceId, profileUrl);
    if (!profileData || profileData.followerCount === 0) {
      logger.debug('linkedin.import.follower_count_not_found', { profileUrl });
      return;
    }

    // Create follower snapshot
    await prisma.followerSnapshot.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        platform: 'linkedin',
        followers: profileData.followerCount,
        following: profileData.connectionCount,
        snapshotAt: new Date(),
      },
    });

    logger.info('linkedin.import.follower_snapshot_created', {
      workspaceId,
      followers: profileData.followerCount,
    });
  } catch (error) {
    logger.warn('linkedin.import.follower_count_failed', { workspaceId, error: String(error) });
  }
}
