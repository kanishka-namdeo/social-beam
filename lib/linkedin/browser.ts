import { logger } from "@/lib/logger";
import { withPage, delay, loadCookie, saveCookie, CookieExpiredError, OperationTimeoutError, shutdown as shutdownBrowserService, PageOptions } from "@/lib/cloakbrowser";
import type { PlaywrightPage } from "./types";
import { decryptToken } from "@/lib/oauth/crypto";
import { prisma } from "@/lib/prisma";

const LI_AT_COOKIE_ENV = "LINKEDIN_LI_AT_COOKIE";

/**
 * Typed error thrown when the LinkedIn li_at cookie has expired.
 * Callers can catch this to distinguish session expiry from other failures.
 */
export class LinkedInCookieExpiredError extends Error {
  constructor(message = "LINKEDIN_COOKIE_EXPIRED") {
    super(message);
    this.name = "LinkedInCookieExpiredError";
  }
}

/**
 * Typed error thrown when a LinkedIn browser operation exceeds the timeout.
 */
export class LinkedInOperationTimeoutError extends Error {
  constructor(message = "LINKEDIN_OPERATION_TIMEOUT") {
    super(message);
    this.name = "LinkedInOperationTimeoutError";
  }
}

let liAtCookie: string | undefined;

function resolveLiAtCookie(): string | null {
  if (liAtCookie) return liAtCookie;

  const cookie = loadCookie("linkedin-li-at", LI_AT_COOKIE_ENV);
  if (cookie) {
    liAtCookie = cookie;
  }
  return cookie;
}

function cacheLiAtCookie(cookie: string): void {
  liAtCookie = cookie;
  saveCookie("linkedin-li-at", cookie);
}

/**
 * Create a browser session with the li_at cookie injected for LinkedIn.
 * Returns null if no cookie is available.
 * Throws LinkedInCookieExpiredError if the session has expired.
 */
export async function withLinkedInPage<T>(fn: (page: PlaywrightPage) => Promise<T>): Promise<T | null> {
  const cookie = resolveLiAtCookie();
  if (!cookie) {
    logger.warn("linkedin.browser.page_skipped", { reason: "no_cookie" });
    return null;
  }

  const options: PageOptions = {
    cookies: [
      {
        name: "li_at",
        value: cookie,
        domain: ".linkedin.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
    stealth: true,
  };

  try {
    return await withPage(async (page) => {
      await page.goto("https://www.linkedin.com", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      const currentUrl = page.url();
      if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
        logger.warn("linkedin.browser.cookie_expired", { url: currentUrl });
        throw new LinkedInCookieExpiredError("LinkedIn session expired — reconnect your account or refresh cookie");
      }

      await delay(1000);

      try {
        return await fn(page);
      } catch (err) {
        if (err instanceof OperationTimeoutError) {
          logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 30000 });
          return null as T;
        }
        throw err;
      }
    }, options);
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      throw err;
    }
    if (err instanceof OperationTimeoutError) {
      logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 30000 });
      return null;
    }
    throw err;
  }
}

/**
 * Cookie resolution priority for per-user sessions:
 * 1. User's encrypted cookie from database (if available)
 * 2. Global file-based cookie (fallback)
 * 3. Environment variable (last resort)
 */
async function resolveUserCookie(workspaceId: string): Promise<string | null> {
  try {
    // Check database for user's encrypted cookie
    const account = await prisma.connectedAccount.findFirst({
      where: {
        workspaceId,
        platform: "linkedin",
        status: "connected",
      },
      select: {
        sessionCookie: true,
        cookieExpiry: true,
      },
    });

    if (account?.sessionCookie) {
      // Check if cookie has expired
      if (account.cookieExpiry && account.cookieExpiry < new Date()) {
        logger.warn("linkedin.browser.user_cookie_expired", { workspaceId });
        return null;
      }

      // Decrypt and return the cookie
      try {
        const decryptedCookie = decryptToken(account.sessionCookie);
        logger.debug("linkedin.browser.user_cookie_loaded", { workspaceId });
        return decryptedCookie;
      } catch (decryptError) {
        logger.error("linkedin.browser.user_cookie_decrypt_failed", { workspaceId });
      }
    }
  } catch (dbError) {
    logger.warn("linkedin.browser.user_cookie_db_failed", { error: String(dbError) });
  }

  // Fallback to global cookie
  const globalCookie = resolveLiAtCookie();
  if (globalCookie) {
    logger.debug("linkedin.browser.fallback_to_global_cookie", { workspaceId });
  }

  return globalCookie;
}

/**
 * Create a browser session with the user's specific li_at cookie.
 * Falls back to global cookie if user doesn't have one.
 * 
 * @param workspaceId - The workspace to fetch the cookie for
 * @param fn - The function to execute with the page
 */
export async function withLinkedInPageForUser<T>(
  workspaceId: string,
  fn: (page: PlaywrightPage) => Promise<T>,
): Promise<T | null> {
  const cookie = await resolveUserCookie(workspaceId);
  if (!cookie) {
    logger.warn("linkedin.browser.page_skipped", { reason: "no_cookie", workspaceId });
    return null;
  }

  const options: PageOptions = {
    cookies: [
      {
        name: "li_at",
        value: cookie,
        domain: ".linkedin.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
    stealth: true,
  };

  try {
    return await withPage(async (page) => {
      await page.goto("https://www.linkedin.com", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      const currentUrl = page.url();
      if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
        logger.warn("linkedin.browser.cookie_expired", { url: currentUrl, workspaceId });
        throw new LinkedInCookieExpiredError("LinkedIn session expired — reconnect your account");
      }

      await delay(1000);

      try {
        return await fn(page);
      } catch (err) {
        if (err instanceof OperationTimeoutError) {
          logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 30000, workspaceId });
          return null as T;
        }
        throw err;
      }
    }, options);
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      throw err;
    }
    if (err instanceof OperationTimeoutError) {
      logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 30000, workspaceId });
      return null;
    }
    throw err;
  }
}

/**
 * Extract the li_at cookie from a page that has navigated to LinkedIn.
 * This is useful for the cookie extraction script.
 */
export async function extractLiAtCookie(page: PlaywrightPage): Promise<string | null> {
  try {
    const cookies = await page.context().cookies();
    const liAt = cookies.find((c) => c.name === "li_at");
    if (liAt?.value) {
      cacheLiAtCookie(liAt.value);
      logger.info("linkedin.browser.cookie_extracted");
      return liAt.value;
    }
  } catch (err) {
    logger.warn("linkedin.browser.cookie_extract_failed", { error: String(err) });
  }
  return null;
}

/**
 * Shutdown the browser instance.
 */
export async function shutdownBrowser(): Promise<void> {
  await shutdownBrowserService();
}

// ─── Post Analytics Scraping ───────────────────────────────────────

export interface ScrapedPostAnalytics {
  likes: number;
  comments: number;
  shares: number;
}

const ANALYTICS_SELECTORS = {
  reactions: [
    ".social-details-social-counts__reactions-count",
    ".social-details-social-counts__likes-count",
    "button[aria-label*='reactions']",
    "button[aria-label*='Reactions']",
  ],
  comments: [
    ".social-details-social-counts__comments",
    "button[aria-label*='comments']",
    "button[aria-label*='Comments']",
  ],
  shares: [
    ".social-details-social-counts__reposts",
    ".social-details-social-counts__reposts-count",
    "button[aria-label*='reposts']",
    "button[aria-label*='Reposts']",
  ],
} as const;

const SHARE_STABILIZE_DELAY_MS = 3000;

/**
 * Parse a LinkedIn engagement text string into a number.
 * Handles formats like "1,234 reactions", "5K Comments", "1.2M", "12".
 */
function parseEngagementNumber(text: string): number {
  if (!text) return 0;

  const cleaned = text.trim().toLowerCase();

  const kMatch = cleaned.match(/^([\d.]+)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);

  const mMatch = cleaned.match(/^([\d.]+)\s*m/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);

  const numMatch = cleaned.replace(/,/g, "").match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return 0;
}

/**
 * Scrape engagement counts from a LinkedIn post page.
 * Uses multiple DOM selector strategies for resilience against UI changes.
 * Returns null if the page is inaccessible (expired cookie, deleted post).
 */
export async function scrapePostAnalytics(postUrl: string): Promise<ScrapedPostAnalytics | null> {
  logger.debug("linkedin.analytics.scrape.start", { postUrl });

  const result = await withLinkedInPage(async (page) => {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await delay(SHARE_STABILIZE_DELAY_MS);

    const analytics = await page.evaluate(
      ({ selectors }: { selectors: typeof ANALYTICS_SELECTORS }) => {
        function trySelectors(selectorList: readonly string[]): string | null {
          for (const selector of selectorList) {
            const el = document.querySelector(selector);
            if (el) return el.textContent?.trim() ?? null;
          }
          return null;
        }

        const reactionsText = trySelectors(selectors.reactions);
        const commentsText = trySelectors(selectors.comments);
        const sharesText = trySelectors(selectors.shares);

        return { reactionsText, commentsText, sharesText };
      },
      { selectors: ANALYTICS_SELECTORS },
    );

    logger.debug("linkedin.analytics.scrape.raw", {
      reactionsText: analytics.reactionsText,
      commentsText: analytics.commentsText,
      sharesText: analytics.sharesText,
    });

    return {
      likes: parseEngagementNumber(analytics.reactionsText ?? ""),
      comments: parseEngagementNumber(analytics.commentsText ?? ""),
      shares: parseEngagementNumber(analytics.sharesText ?? ""),
    };
  });

  if (result === null) {
    logger.warn("linkedin.analytics.scrape.no_cookie", { postUrl });
    return null;
  }

  logger.debug("linkedin.analytics.scrape.complete", { postUrl, ...result });
  return result;
}

// ─── Enhanced Dashboard Analytics Scraping ────────────────────────

/**
 * Enhanced analytics from LinkedIn's own analytics dashboard.
 * Only available when viewing your OWN posts (requires li_at cookie).
 */
export interface EnhancedLinkedInPostAnalytics {
  // From public post page (visible to anyone)
  likes: number;
  comments: number;
  shares: number;
  
  // From analytics dashboard (requires authenticated access to your own post)
  impressions: number;
  uniqueImpressions: number;
  clicks: number;
  engagementRate: number;
  saves: number;
  profileViews: number;
  followersGained: number;
}

/**
 * LinkedIn profile follower data scraped from profile page.
 */
export interface LinkedInProfileData {
  followerCount: number;
  connectionCount: number;
  profileViews: number;
}

// Analytics dashboard selectors
// These target the analytics panel that appears when viewing your own posts
const ANALYTICS_DASHBOARD_SELECTORS = {
  impressions: [
    '[data-impressions-count]',
    '.analytics-statistics__impressions',
    '[class*="impressions"]',
    'div[class*="analytics"][class*="impressions"]',
    'span[aria-label*="impressions"]',
    'span[aria-label*="Impressions"]',
  ],
  uniqueImpressions: [
    '[data-unique-impressions-count]',
    '.analytics-statistics__unique-impressions',
    '[class*="unique-impressions"]',
    '[class*="uniqueImpressions"]',
    'span[aria-label*="unique impressions"]',
    'span[aria-label*="Unique impressions"]',
  ],
  clicks: [
    '[data-clicks-count]',
    '.analytics-statistics__clicks',
    '[class*="clicks"]',
    'span[aria-label*="clicks"]',
    'span[aria-label*="Clicks"]',
  ],
  engagementRate: [
    '[data-engagement-rate]',
    '.analytics-statistics__engagement-rate',
    '[class*="engagement-rate"]',
    '[class*="engagementRate"]',
    'span[aria-label*="engagement rate"]',
    'span[aria-label*="Engagement rate"]',
  ],
  saves: [
    '[data-saves-count]',
    '.analytics-statistics__saves',
    '[class*="saves"]',
    'span[aria-label*="saves"]',
    'span[aria-label*="Saves"]',
  ],
  profileViews: [
    '[data-profile-views]',
    '.analytics-statistics__profile-views',
    '[class*="profile-views"]',
    'span[aria-label*="profile views"]',
    'span[aria-label*="Profile views"]',
  ],
} as const;

/**
 * Parse an engagement rate percentage string to a decimal.
 * Handles formats like "3.2%", "3.2", "0.032", "3.2K%".
 */
function parseEngagementRate(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().toLowerCase().replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)\s*%/);
  if (match) {
    return parseFloat(match[1]) / 100;
  }
  const num = parseFloat(cleaned);
  if (num > 1) return num / 100; // Assume percentage if > 1
  return num;
}

/**
 * Scrape full analytics from LinkedIn's own analytics dashboard.
 * Only works for your OWN posts (requires li_at cookie).
 * 
 * Navigate to the post, then look for the analytics panel that shows:
 * - Impressions (total views)
 * - Unique impressions (unique viewers)
 * - Clicks (all click types)
 * - Engagement rate
 * - Saves, profile views, followers gained (if available)
 */
export async function scrapeEnhancedPostAnalytics(
  postUrl: string,
): Promise<EnhancedLinkedInPostAnalytics | null> {
  logger.debug("linkedin.enhanced.analytics.scrape.start", { postUrl });

  const result = await withLinkedInPage(async (page) => {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for page to stabilize
    await delay(SHARE_STABILIZE_DELAY_MS);

    // Try to find and click analytics panel/tab
    // LinkedIn shows a small analytics icon or link on your own posts
    const analyticsPanel = await page.$('[class*="analytics"], [class*="Analytics"]');
    if (analyticsPanel) {
      try {
        await analyticsPanel.click();
        await delay(1500); // Wait for panel to expand
      } catch {
        // Not clickable, continue anyway
      }
    }

    // Scrape all analytics metrics using multiple selector strategies
    const analytics = await page.evaluate(
      ({ selectors }: { selectors: typeof ANALYTICS_DASHBOARD_SELECTORS }) => {
        function trySelectors(selectorList: readonly string[]): string | null {
          for (const selector of selectorList) {
            const el = document.querySelector(selector);
            if (el) return el.textContent?.trim() ?? null;
          }
          return null;
        }

        const impressionsText = trySelectors(selectors.impressions);
        const uniqueImpressionsText = trySelectors(selectors.uniqueImpressions);
        const clicksText = trySelectors(selectors.clicks);
        const engagementRateText = trySelectors(selectors.engagementRate);
        const savesText = trySelectors(selectors.saves);
        const profileViewsText = trySelectors(selectors.profileViews);

        return {
          impressionsText,
          uniqueImpressionsText,
          clicksText,
          engagementRateText,
          savesText,
          profileViewsText,
        };
      },
      { selectors: ANALYTICS_DASHBOARD_SELECTORS },
    );

    logger.debug("linkedin.enhanced.analytics.scrape.raw", {
      impressionsText: analytics.impressionsText,
      uniqueImpressionsText: analytics.uniqueImpressionsText,
      clicksText: analytics.clicksText,
      engagementRateText: analytics.engagementRateText,
    });

    return {
      impressions: parseEngagementNumber(analytics.impressionsText ?? ""),
      uniqueImpressions: parseEngagementNumber(analytics.uniqueImpressionsText ?? ""),
      clicks: parseEngagementNumber(analytics.clicksText ?? ""),
      engagementRate: parseEngagementRate(analytics.engagementRateText ?? ""),
      saves: parseEngagementNumber(analytics.savesText ?? ""),
      profileViews: parseEngagementNumber(analytics.profileViewsText ?? ""),
      followersGained: 0, // Not typically available on post-level dashboard
    };
  });

  if (result === null) {
    logger.warn("linkedin.enhanced.analytics.scrape.no_cookie", { postUrl });
    return null;
  }

  // Get basic engagement from public post page
  const basicAnalytics = await scrapePostAnalytics(postUrl);
  if (!basicAnalytics) {
    logger.warn("linkedin.enhanced.basic.analytics.failed", { postUrl });
    // Return enhanced data without basic engagement
    return {
      ...result,
      likes: 0,
      comments: 0,
      shares: 0,
    };
  }

  const enhanced: EnhancedLinkedInPostAnalytics = {
    ...result,
    likes: basicAnalytics.likes,
    comments: basicAnalytics.comments,
    shares: basicAnalytics.shares,
  };

  logger.debug("linkedin.enhanced.analytics.scrape.complete", {
    postUrl,
    impressions: enhanced.impressions,
    engagementRate: enhanced.engagementRate,
    likes: enhanced.likes,
    comments: enhanced.comments,
    shares: enhanced.shares,
  });

  return enhanced;
}

/**
 * Scrape profile data from a LinkedIn profile page.
 * Extracts follower count, connection count, and profile view count.
 */
export async function scrapeProfileData(
  profileUrl: string,
): Promise<LinkedInProfileData | null> {
  logger.debug("linkedin.profile.data.scrape.start", { profileUrl });

  const result = await withLinkedInPage(async (page) => {
    await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await delay(2000);

    // Check for cookie-expired redirect
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
      logger.warn("linkedin.profile.scrape.cookie_expired", { url: currentUrl });
      throw new LinkedInCookieExpiredError("LinkedIn session expired");
    }

    // Scrape profile data using multiple selector strategies
    const profileData = await page.evaluate(() => {
      function trySelectors(selectorList: readonly string[]): string | null {
        for (const selector of selectorList) {
          const el = document.querySelector(selector);
          if (el) return el.textContent?.trim() ?? null;
        }
        return null;
      }

      // Follower count selectors
      const followerSelectors = [
        '[data-follower-count]',
        '.pv-member-stats__followers-count',
        '[class*="follower-count"]',
        '[class*="followerCount"]',
        'a[href*="followers"] [class*="count"]',
        '[aria-label*="followers"]',
        'span:has-text("followers")',
      ];

      // Connection count selectors
      const connectionSelectors = [
        '[data-connection-count]',
        '.pv-member-stats__connections-count',
        '[class*="connections"]',
        '[class*="connectionsCount"]',
        '[aria-label*="connections"]',
      ];

      // Profile views (usually visible on own profile dashboard)
      const profileViewSelectors = [
        '[data-profile-views]',
        '[class*="profile-views"]',
        '[class*="profileViews"]',
        'a[href*="profile-views"] [class*="count"]',
        '[aria-label*="profile views"]',
      ];

      const followersText = trySelectors(followerSelectors);
      const connectionsText = trySelectors(connectionSelectors);
      const profileViewsText = trySelectors(profileViewSelectors);

      return { followersText, connectionsText, profileViewsText };
    });

    return {
      followerCount: parseEngagementNumber(profileData.followersText ?? ""),
      connectionCount: parseEngagementNumber(profileData.connectionsText ?? ""),
      profileViews: parseEngagementNumber(profileData.profileViewsText ?? ""),
    };
  });

  if (result === null) {
    logger.warn("linkedin.profile.data.scrape.no_cookie", { profileUrl });
    return null;
  }

  logger.debug("linkedin.profile.data.scrape.complete", {
    profileUrl,
    followerCount: result.followerCount,
    connectionCount: result.connectionCount,
    profileViews: result.profileViews,
  });

  return result;
}

// ─── Per-User Enhanced Scraping ───────────────────────────────────

/**
 * Scrape enhanced analytics for a specific workspace's LinkedIn account.
 * Uses the workspace's encrypted cookie from the database.
 */
export async function scrapeEnhancedPostAnalyticsForUser(
  workspaceId: string,
  postUrl: string,
): Promise<EnhancedLinkedInPostAnalytics | null> {
  logger.debug("linkedin.enhanced.analytics.scrape.start.user", { postUrl, workspaceId });

  const result = await withLinkedInPageForUser(workspaceId, async (page) => {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await delay(SHARE_STABILIZE_DELAY_MS);

    const analyticsPanel = await page.$('[class*="analytics"], [class*="Analytics"]');
    if (analyticsPanel) {
      try {
        await analyticsPanel.click();
        await delay(1500);
      } catch {
        // Not clickable, continue anyway
      }
    }

    const analytics = await page.evaluate(
      ({ selectors }: { selectors: typeof ANALYTICS_DASHBOARD_SELECTORS }) => {
        function trySelectors(selectorList: readonly string[]): string | null {
          for (const selector of selectorList) {
            const el = document.querySelector(selector);
            if (el) return el.textContent?.trim() ?? null;
          }
          return null;
        }

        return {
          impressionsText: trySelectors(selectors.impressions),
          uniqueImpressionsText: trySelectors(selectors.uniqueImpressions),
          clicksText: trySelectors(selectors.clicks),
          engagementRateText: trySelectors(selectors.engagementRate),
          savesText: trySelectors(selectors.saves),
          profileViewsText: trySelectors(selectors.profileViews),
        };
      },
      { selectors: ANALYTICS_DASHBOARD_SELECTORS },
    );

    return {
      impressions: parseEngagementNumber(analytics.impressionsText ?? ""),
      uniqueImpressions: parseEngagementNumber(analytics.uniqueImpressionsText ?? ""),
      clicks: parseEngagementNumber(analytics.clicksText ?? ""),
      engagementRate: parseEngagementRate(analytics.engagementRateText ?? ""),
      saves: parseEngagementNumber(analytics.savesText ?? ""),
      profileViews: parseEngagementNumber(analytics.profileViewsText ?? ""),
      followersGained: 0,
    };
  });

  if (result === null) {
    logger.warn("linkedin.enhanced.analytics.scrape.no_cookie.user", { postUrl, workspaceId });
    return null;
  }

  // Get basic engagement from public post page (doesn't need user cookie)
  const basicAnalytics = await scrapePostAnalytics(postUrl);
  
  return {
    ...result,
    likes: basicAnalytics?.likes ?? 0,
    comments: basicAnalytics?.comments ?? 0,
    shares: basicAnalytics?.shares ?? 0,
  };
}

/**
 * Scrape profile data for a specific workspace's LinkedIn account.
 */
export async function scrapeProfileDataForUser(
  workspaceId: string,
  profileUrl: string,
): Promise<LinkedInProfileData | null> {
  logger.debug("linkedin.profile.data.scrape.start.user", { profileUrl, workspaceId });

  const result = await withLinkedInPageForUser(workspaceId, async (page) => {
    await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await delay(2000);

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
      logger.warn("linkedin.profile.scrape.cookie_expired.user", { url: currentUrl, workspaceId });
      throw new LinkedInCookieExpiredError("LinkedIn session expired");
    }

    const profileData = await page.evaluate(() => {
      function trySelectors(selectorList: readonly string[]): string | null {
        for (const selector of selectorList) {
          const el = document.querySelector(selector);
          if (el) return el.textContent?.trim() ?? null;
        }
        return null;
      }

      return {
        followersText: trySelectors([
          '[data-follower-count]',
          '.pv-member-stats__followers-count',
          '[class*="follower-count"]',
          '[class*="followerCount"]',
          'a[href*="followers"] [class*="count"]',
        ]),
        connectionsText: trySelectors([
          '[data-connection-count]',
          '.pv-member-stats__connections-count',
          '[class*="connections"]',
          '[class*="connectionsCount"]',
        ]),
        profileViewsText: trySelectors([
          '[data-profile-views]',
          '[class*="profile-views"]',
          '[class*="profileViews"]',
        ]),
      };
    });

    return {
      followerCount: parseEngagementNumber(profileData.followersText ?? ""),
      connectionCount: parseEngagementNumber(profileData.connectionsText ?? ""),
      profileViews: parseEngagementNumber(profileData.profileViewsText ?? ""),
    };
  });

  return result;
}
