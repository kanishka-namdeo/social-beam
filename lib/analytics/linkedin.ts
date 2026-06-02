import { logger } from '@/lib/logger';
import { scrapePostAnalytics } from '@/lib/linkedin/browser';

export interface LinkedInPostAnalytics {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  clicks: number;
  engagementRate: number;
}

/**
 * Fetch analytics for a single LinkedIn post via browser scraping.
 *
 * Read scopes (r_member_social, r_organization_social) are unavailable for this app.
 * All analytics are scraped from the post's public page using Playwright.
 *
 * Metrics not available via scraping (impressions, clicks) are returned as 0.
 *
 * @param postUrn - The LinkedIn post URN (e.g., "urn:li:share:123456789")
 * @param _accessToken - Unused (kept for API compatibility)
 * @returns Analytics data for the post (zeros for unavailable metrics)
 */
export async function fetchPostAnalytics(
  postUrn: string,
  _accessToken: string,
): Promise<LinkedInPostAnalytics | null> {
  try {
    const shareId = extractShareId(postUrn);
    if (!shareId) {
      logger.warn('linkedin.analytics.invalid_urn', { postUrn });
      return null;
    }

    // Normalize URN to share format for URL construction
    const shareUrn = postUrn.includes('share:') ? postUrn : `urn:li:share:${shareId}`;
    const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(shareUrn)}`;

    const scraped = await scrapePostAnalytics(postUrl);
    if (!scraped) {
      logger.warn('linkedin.analytics.scrape_failed', { postUrn });
      return null;
    }

    const totalEngagements = scraped.likes + scraped.comments + scraped.shares;

    return {
      postId: shareId,
      likes: scraped.likes,
      comments: scraped.comments,
      shares: scraped.shares,
      impressions: 0,
      clicks: 0,
      engagementRate: 0,
    };
  } catch (error) {
    logger.error('linkedin.analytics.fetch_error', { postUrn, error: String(error) });
    return null;
  }
}

/**
 * Extract the numeric share ID from a LinkedIn URN.
 * Handles formats like:
 * - urn:li:share:123456789
 * - urn:li:ugcPost:123456789
 * - urn:li:activity:123456789
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
 * Fetch follower count for a LinkedIn profile or organization.
 * For personal profiles, LinkedIn doesn't expose follower counts via public API.
 * For organizations, requires r_organization_social (unavailable).
 * Always returns 0 — callers should not rely on this value.
 */
export async function fetchFollowerCount(
  personId: string,
  _accessToken: string,
): Promise<number> {
  logger.debug('linkedin.follower_count.unavailable', { personId });
  return 0;
}

/**
 * Fetch follower count for a LinkedIn organization page.
 * Requires r_organization_social scope (unavailable for this app).
 * Always returns 0.
 */
export async function fetchOrganizationFollowerCount(
  organizationUrn: string,
  _accessToken: string,
): Promise<number> {
  logger.debug('linkedin.organization_follower_count.unavailable', { organizationUrn });
  return 0;
}
