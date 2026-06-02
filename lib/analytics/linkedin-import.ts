import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';
import { scrapeEnhancedPostAnalyticsForUser, scrapeEnhancedPostAnalytics, scrapeProfileDataForUser, scrapeProfileData, scrapePostAnalytics } from '@/lib/linkedin/browser';

export interface ImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

/**
 * Scraped post from the LinkedIn activity feed.
 */
interface ScrapedPost {
  urn: string;
  url: string;
  text: string;
  timestamp: Date | null;
}

const ACTIVITY_PAGE_URL = 'https://www.linkedin.com/feed/?segmentationFilter=memberActivity';
const PAGE_LOAD_TIMEOUT_MS = 30000;
const FEED_STABILIZE_DELAY_MS = 5000;
const POST_CONTAINERS = [
  'div.feed-shared-update-v2',
  "article[data-view-name='update']",
  'div.update-components-container',
  'div.occludable-update',
];

/**
 * Import all LinkedIn posts and their analytics for a connected account.
 * Discovers posts via browser scraping (read API scopes are unavailable).
 */
export async function importLinkedinPosts(
  workspaceId: string,
  _encryptedAccessToken: string,
  platformUserId: string,
  sourcePlatform: 'personal' | 'organization' = 'personal',
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

  logger.info('linkedin.import.start', { workspaceId, authorUrn, sourcePlatform });

  try {
    // Step 1: Fetch follower count (unavailable for personal, requires r_organization_social for org)
    await importFollowerCount(workspaceId, sourcePlatform, authorUrn);
    result.followerSnapshotCreated = true;
  } catch (error) {
    logger.warn('linkedin.import.follower_count_failed', { workspaceId, error: String(error) });
  }

  try {
    // Step 2: Scrape posts from the activity feed
    const posts = await scrapeUserPosts();
    logger.info('linkedin.import.posts_found', { workspaceId, count: posts.length });

    // Step 3: For each post, create synthetic Post + AnalyticsSnapshot
    for (const scrapedPost of posts) {
      try {
        await importScrapedPost(workspaceId, scrapedPost, authorUrn);
        result.postsSynced += 1;
        result.snapshotsCreated += 1;
      } catch (error) {
        logger.warn('linkedin.import.single_post_failed', {
          workspaceId,
          postUrn: scrapedPost.urn,
          error: String(error),
        });
      }
    }
  } catch (error) {
    const msg = `Failed to scrape posts: ${error instanceof Error ? error.message : 'Unknown'}`;
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
    post = await prisma.post.create({
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
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'linkedin',
            content: scrapedPost.text,
            status: 'PUBLISHED',
            externalId: shareId,
            postUrl: scrapedPost.url,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'linkedin' },
        },
      },
    });
  }

  // Fetch enhanced analytics for this post (impressions, engagement rate, etc.)
  const enhanced = await scrapeEnhancedPostAnalyticsForUser(workspaceId, scrapedPost.url);
  
  // Fallback to basic scraper if enhanced fails
  const basic = !enhanced ? await scrapePostAnalytics(scrapedPost.url) : null;
  const analytics = enhanced || basic;
  
  if (!analytics) {
    logger.warn('linkedin.import.analytics_not_available', { postUrn });
    return;
  }

  const totalEngagements = analytics.likes + analytics.comments + analytics.shares;

  // Create analytics snapshot with all available data
  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post.id,
      platform: 'linkedin',
      likes: analytics.likes,
      comments: analytics.comments,
      shares: analytics.shares,
      impressions: enhanced?.impressions ?? 0,
      reach: enhanced?.uniqueImpressions ?? enhanced?.impressions ?? 0,
      clicks: enhanced?.clicks ?? 0,
      saves: enhanced?.saves ?? 0,
      videoViews: 0,
      profileVisits: enhanced?.profileViews ?? 0,
      websiteClicks: enhanced?.clicks ?? 0,
      engagementRate: enhanced?.engagementRate ?? 0,
      snapshotAt: new Date(),
    },
  });

  logger.debug('linkedin.import.snapshot_created', {
    workspaceId,
    postId: post.id,
    impressions: enhanced?.impressions ?? 0,
    engagementRate: enhanced?.engagementRate ?? 0,
    likes: analytics.likes,
    comments: analytics.comments,
    totalEngagements,
  });
}

/**
 * Scrape user's recent posts from the LinkedIn activity feed.
 * Reuses the same selector strategies as the inbox scraper.
 */
async function scrapeUserPosts(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  // Use the inbox scraper's withLinkedInPage to avoid duplicating browser management
  const { withLinkedInPage } = await import('@/lib/linkedin/browser');

  const result = await withLinkedInPage(async (page) => {
    await page.goto(ACTIVITY_PAGE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Check for cookie-expired redirect
    const feedUrl = page.url();
    if (feedUrl.includes('/login') || feedUrl.includes('/uas/oauth')) {
      return posts;
    }

    await new Promise((resolve) => setTimeout(resolve, FEED_STABILIZE_DELAY_MS));

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

    // Extract post data
    const postData = await page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector)).slice(0, 10);
      return elements.map((el) => {
        const link = el.querySelector("a[href*='feed/update'], a[href*='activity'], a[href*='/posts/']");
        const url = link ? (link as HTMLAnchorElement).href : null;
        const textEl = el.querySelector("div.feed-shared-text, span.break-words, div.attributed-text-segment-list__content, span[class*='main-content']");
        const text = textEl ? (textEl as HTMLElement).innerText?.trim() : '';
        const timeEl = el.querySelector('time');
        const datetime = timeEl ? (timeEl as HTMLTimeElement).dateTime : null;
        return { url, text, datetime };
      });
    }, workingSelector);

    for (const pd of postData) {
      if (!pd.url) continue;
      const urn = extractPostUrnFromUrl(pd.url);
      if (!urn) continue;

      posts.push({
        urn,
        url: pd.url.startsWith('http') ? pd.url : `https://www.linkedin.com${pd.url}`,
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
      // For personal profiles, we need the username which we don't have
      // Skip for now - profile URL is needed
      logger.debug('linkedin.import.follower_skipped_no_profile_url', { authorUrn });
      return;
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
