import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';
import { scrapeEnhancedPostAnalyticsForUser, scrapeEnhancedPostAnalytics, scrapeProfileDataForUser, scrapeProfileData, scrapePostAnalytics, scrapePostAnalyticsForUser } from '@/lib/linkedin/browser';
import { scrapeCreatorDashboardForUser, CreatorDashboardPost, TimeRange } from '@/lib/linkedin/creator-analytics-scraper';

export interface ImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

const DEFAULT_TIME_RANGE: TimeRange = "90 days";

/**
 * Scraped post from the LinkedIn activity feed.
 */
interface ScrapedPost {
  urn: string;
  url: string;
  text: string;
  timestamp: Date | null;
}

const ACTIVITY_PAGE_URL = 'https://www.linkedin.com/in/me/recent-activity/all/';
const PAGE_LOAD_TIMEOUT_MS = 60000;
const FEED_STABILIZE_DELAY_MS = 5000;
const POST_CONTAINERS = [
  'div.occludable-update',
  'div.feed-shared-update-v2',
  "article[data-view-name='update']",
  'div.update-components-container',
];

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
    const feedPosts = await scrapeUserPosts(workspaceId);
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

  return result;
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
  } else if (dashboardPost.analyticsUrl && !post.PostPlatform[0]?.analyticsUrl) {
    // Fill in missing analyticsUrl on existing posts
    await prisma.postPlatform.update({
      where: { id: post.PostPlatform[0].id },
      data: {
        analyticsUrl: dashboardPost.analyticsUrl.startsWith('http')
          ? dashboardPost.analyticsUrl
          : `https://www.linkedin.com${dashboardPost.analyticsUrl}`,
      },
    });
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
  } else if (postUrn.includes('activity') && !post.PostPlatform[0]?.analyticsUrl) {
    // Fill in missing analyticsUrl on existing posts
    await prisma.postPlatform.update({
      where: { id: post.PostPlatform[0].id },
      data: {
        analyticsUrl: `https://www.linkedin.com/analytics/post-summary/${encodeURIComponent(postUrn)}/`,
      },
    });
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
 * Scrape user's recent posts from the LinkedIn activity feed.
 * Reuses the same selector strategies as the inbox scraper.
 */
async function scrapeUserPosts(workspaceId: string): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  const { withLinkedInPageForUser } = await import('@/lib/linkedin/browser');

  const result = await withLinkedInPageForUser(workspaceId, async (page) => {
    await page.goto(ACTIVITY_PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Check for cookie-expired redirect
    const feedUrl = page.url();
    if (feedUrl.includes('/login') || feedUrl.includes('/uas/oauth')) {
      return posts;
    }

    // Wait for initial render then scroll to trigger lazy loading
    await new Promise((resolve) => setTimeout(resolve, FEED_STABILIZE_DELAY_MS));

    // Scroll down aggressively to trigger lazy loading of activity feed content (90-day coverage)
    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 1000));
      }
    });

    // Wait for lazy content to render after scrolling
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Try each post container selector strategy
    let workingSelector: string | null = null;
    for (const selector of POST_CONTAINERS) {
      try {
        const element = await page.$(selector);
        if (element) {
          workingSelector = selector;
          break;
        }
      } catch {
        // Selector syntax error, try next
      }
    }

    if (!workingSelector) {
      logger.warn('linkedin.import.no_posts_found', { tried: POST_CONTAINERS });
      return posts;
    }

    // Wait for post containers to appear
    try {
      await page.waitForSelector(workingSelector, { timeout: 15000 });
    } catch {
      return posts;
    }

    // Extract post data (up to 50 posts for 90-day coverage)
    const postData = await page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector)).slice(0, 50);
      return elements.map((el) => {
        // Find any link containing urn:li:share or urn:li:activity
        const allLinks = Array.from(el.querySelectorAll('a'));
        let foundUrl: string | null = null;
        for (const a of allLinks) {
          const href = a.getAttribute('href') || '';
          if (href.includes('urn:li:share') || href.includes('urn:li:activity')) {
            foundUrl = a.href; // Use absolute URL from anchor element
            break;
          }
        }
        const url = foundUrl;
        const textEl = el.querySelector("div.attributed-text-segment-list__content, span.break-words, div[class*='feed-shared-text']");
        const text = textEl ? (textEl as HTMLElement).innerText?.trim() : '';
        const timeEl = el.querySelector('time');
        const datetime = timeEl ? (timeEl as HTMLTimeElement).dateTime : null;
        return { url, text, datetime };
      });
    }, workingSelector);

    // Debug: log what we found
    const postCount = postData.filter(pd => pd.url).length;
    logger.info('linkedin.import.posts_scraped', { workspaceId, postCount, samples: postData.slice(0, 3) });

    for (const pd of postData) {
      if (!pd.url) continue;
      const urn = extractPostUrnFromUrl(pd.url);
      if (!urn) continue;

      // Convert analytics/post-summary URLs to public feed URLs for scraping
      // Activity page links are /analytics/post-summary/urn:li:activity:XXX/
      // But scrapers need /feed/update/urn:li:activity:XXX format
      const publicUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`;

      posts.push({
        urn,
        url: publicUrl,
        text: pd.text || '',
        timestamp: pd.datetime ? new Date(pd.datetime) : null,
      });
    }

    return posts;
  });

  return result ?? [];
}

/**
 * Extract a post URN from a LinkedIn URL.
 */
function extractPostUrnFromUrl(url: string): string | null {
  const feedMatch = url.match(/\/feed\/update\/(urn:li:[^\/\?]+)/);
  if (feedMatch) return feedMatch[1];

  const activityMatch = url.match(/activity[-:](\d+)/);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;

  const shareMatch = url.match(/share[-:](\d+)/);
  if (shareMatch) return `urn:li:share:${shareMatch[1]}`;

  return null;
}

/**
 * Extract the numeric share ID from a LinkedIn URN.
 */
function extractShareId(urn: string): string | null {
  if (urn.includes('urn:li:')) {
    const parts = urn.split(':');
    return parts[parts.length - 1] ?? null;
  }
  if (/^\d+$/.test(urn)) {
    return urn;
  }
  return null;
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
