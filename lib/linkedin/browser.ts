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
let liAtCookieTimestamp: number | undefined;
const COOKIE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache TTL

function resolveLiAtCookie(): string | null {
  // Check if cached cookie is stale (older than 24 hours)
  if (liAtCookie && liAtCookieTimestamp) {
    if (Date.now() - liAtCookieTimestamp > COOKIE_CACHE_TTL_MS) {
      logger.debug("linkedin.browser.cookie_cache_expired");
      liAtCookie = undefined;
      liAtCookieTimestamp = undefined;
    }
  }
  
  if (liAtCookie) return liAtCookie;

  const cookie = loadCookie("linkedin-li-at", LI_AT_COOKIE_ENV);
  if (cookie) {
    liAtCookie = cookie;
    liAtCookieTimestamp = Date.now();
  }
  return cookie;
}

function cacheLiAtCookie(cookie: string): void {
  liAtCookie = cookie;
  liAtCookieTimestamp = Date.now();
  saveCookie("linkedin-li-at", cookie);
}

/**
 * Clear the cached cookie (useful when cookie is detected as expired).
 */
export function clearCachedCookie(): void {
  liAtCookie = undefined;
  liAtCookieTimestamp = undefined;
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

  // Use visible browser + storage state persistence for LinkedIn
  const options: PageOptions & { headless?: boolean; saveStorageState?: boolean } = {
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
    headless: false,
    saveStorageState: true,
    timeoutMs: 120000, // LinkedIn visible browser scraping needs more time
  };

  try {
    return await withPage(async (page) => {
      await page.goto("https://www.linkedin.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
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

  // Handle "Name and 2 others reacted" → extract the "2"
  const othersMatch = cleaned.match(/(\d+)\s*others?\s+react/i);
  if (othersMatch) return parseInt(othersMatch[1], 10);

  // Handle any number anywhere in text (fallback for "244 impressions")
  const anyNum = cleaned.match(/(\d[\d,]*)/);
  if (anyNum) return parseInt(anyNum[1].replace(/,/g, ""), 10);

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

    // Fallback: parse all visible text for engagement counts
    // This works regardless of CSS class names since LinkedIn frequently changes them
    const selectorsJson2 = JSON.stringify(ANALYTICS_SELECTORS);
    const textCounts = await page.evaluate(`
      (() => {
        const selectors = ${selectorsJson2};
        const allText = document.body?.innerText || '';
        const lines = allText.split('\\n').map(l => l.trim()).filter(Boolean);

        let reactionsText = null;
        let commentsText = null;
        let sharesText = null;

        for (const line of lines) {
          if (!reactionsText && /\\d/.test(line) && /react|like/i.test(line)) {
            reactionsText = line;
          }
          if (!commentsText && /\\d/.test(line) && /comment/i.test(line)) {
            commentsText = line;
          }
          if (!sharesText && /\\d/.test(line) && /repost|share/i.test(line)) {
            sharesText = line;
          }
        }

        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
          }
          return null;
        }

        return {
          reactionsText: trySelectors(selectors.reactions) || reactionsText,
          commentsText: trySelectors(selectors.comments) || commentsText,
          sharesText: trySelectors(selectors.shares) || sharesText,
        };
      })()
    `) as { reactionsText: string | null; commentsText: string | null; sharesText: string | null };

    logger.debug("linkedin.analytics.scrape.raw", {
      reactionsText: textCounts.reactionsText,
      commentsText: textCounts.commentsText,
      sharesText: textCounts.sharesText,
    });

    return {
      likes: parseEngagementNumber(textCounts.reactionsText ?? ""),
      comments: parseEngagementNumber(textCounts.commentsText ?? ""),
      shares: parseEngagementNumber(textCounts.sharesText ?? ""),
    };
  });

  if (result === null) {
    logger.warn("linkedin.analytics.scrape.no_cookie", { postUrl });
    return null;
  }

  // Self-healer trigger: if all analytics metrics are 0, selectors may be broken
  if (result.likes === 0 && result.comments === 0 && result.shares === 0) {
    logger.warn("linkedin.analytics.scrape.all_zeros", { postUrl });
    import("@/lib/agent/self-healer/trigger").then(({ triggerSelfHealer }) =>
      triggerSelfHealer("browser-analytics").catch(() => {}),
    ).catch(() => {});
  }

  logger.debug("linkedin.analytics.scrape.complete", { postUrl, ...result });
  return result;
}

/**
 * Scrape engagement counts using the per-user cookie with storage state persistence.
 * Uses text-based fallback when CSS selectors fail.
 */
export async function scrapePostAnalyticsForUser(
  workspaceId: string,
  postUrl: string,
): Promise<ScrapedPostAnalytics | null> {
  logger.debug("linkedin.analytics.scrape.start.user", { postUrl, workspaceId });

  const result = await withLinkedInPageForUser(workspaceId, async (page) => {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await delay(SHARE_STABILIZE_DELAY_MS);

    const selectorsJson3 = JSON.stringify(ANALYTICS_SELECTORS);
    const textCounts = await page.evaluate(`
      (() => {
        const selectors = ${selectorsJson3};
        const allText = document.body?.innerText || '';
        const lines = allText.split('\\n').map(l => l.trim()).filter(Boolean);

        let reactionsText = null;
        let commentsText = null;
        let sharesText = null;

        for (const line of lines) {
          if (!reactionsText && /\\d/.test(line) && /react|like/i.test(line)) {
            reactionsText = line;
          }
          if (!commentsText && /\\d/.test(line) && /comment/i.test(line)) {
            commentsText = line;
          }
          if (!sharesText && /\\d/.test(line) && /repost|share/i.test(line)) {
            sharesText = line;
          }
        }

        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
          }
          return null;
        }

        return {
          reactionsText: trySelectors(selectors.reactions) || reactionsText,
          commentsText: trySelectors(selectors.comments) || commentsText,
          sharesText: trySelectors(selectors.shares) || sharesText,
        };
      })()
    `) as { reactionsText: string | null; commentsText: string | null; sharesText: string | null };

    return {
      likes: parseEngagementNumber(textCounts.reactionsText ?? ""),
      comments: parseEngagementNumber(textCounts.commentsText ?? ""),
      shares: parseEngagementNumber(textCounts.sharesText ?? ""),
    };
  });

  if (result === null) {
    logger.warn("linkedin.analytics.scrape.no_cookie.user", { postUrl, workspaceId });
    return null;
  }

  logger.debug("linkedin.analytics.scrape.complete.user", { postUrl, ...result });
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

    // Scrape all analytics metrics using multiple selector strategies (string-based evaluate)
    const selectorsJson = JSON.stringify(ANALYTICS_DASHBOARD_SELECTORS);
    const analytics = await page.evaluate(`
      (() => {
        const selectors = ${selectorsJson};

        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
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
      })()
    `) as Record<string, string | null>;

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

    // Scrape profile data using multiple selector strategies (string-based evaluate)
    const profileData = await page.evaluate(`
      (() => {
        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
          }
          return null;
        }

        const followerSelectors = [
          '[data-follower-count]',
          '.pv-member-stats__followers-count',
          '[class*="follower-count"]',
          '[class*="followerCount"]',
          'a[href*="followers"] [class*="count"]',
          '[aria-label*="followers"]',
          'span:has-text("followers")',
        ];

        const connectionSelectors = [
          '[data-connection-count]',
          '.pv-member-stats__connections-count',
          '[class*="connections"]',
          '[class*="connectionsCount"]',
          '[aria-label*="connections"]',
        ];

        const profileViewSelectors = [
          '[data-profile-views]',
          '[class*="profile-views"]',
          '[class*="profileViews"]',
          'a[href*="profile-views"] [class*="count"]',
          '[aria-label*="profile views"]',
        ];

        return {
          followersText: trySelectors(followerSelectors),
          connectionsText: trySelectors(connectionSelectors),
          profileViewsText: trySelectors(profileViewSelectors),
        };
      })()
    `) as { followersText: string | null; connectionsText: string | null; profileViewsText: string | null };

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
      timeout: 30000,
    });

    // Wait for analytics content to render
    await delay(5000);

    // Scrape analytics using string-based evaluation to avoid tsx __name injection issues
    const selectorsJson = JSON.stringify(ANALYTICS_DASHBOARD_SELECTORS);
    const analytics = await page.evaluate(`
      (() => {
        const selectors = ${selectorsJson};

        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
          }
          return null;
        }

        const allText = document.body?.innerText || '';
        const lines = allText.split('\\n').map(l => l.trim()).filter(Boolean);

        function findNumberByLabel(label) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes(label)) {
              if (i > 0) {
                const prevMatch = lines[i - 1].match(/^([\\d,]+\\.?\\d*\\s*[kKmM]?%?)$/);
                if (prevMatch) return prevMatch[1];
              }
              const sameMatch = lines[i].match(/([\\d,]+\\.?\\d*\\s*[kKmM]?)/);
              if (sameMatch) return sameMatch[1];
              if (i + 1 < lines.length) {
                const nextMatch = lines[i + 1].match(/^([\\d,]+\\.?\\d*\\s*[kKmM]?%?)$/);
                if (nextMatch) return nextMatch[1];
              }
            }
          }
          return null;
        }

        const reactionsText = trySelectors([
          '.analytics-statistics__reactions',
          '[class*="reactions-count"]',
          'span[aria-label*="reactions"]',
          'span[aria-label*="Reactions"]',
        ]) || findNumberByLabel('reaction');

        const commentsText = trySelectors([
          '.analytics-statistics__comments',
          '[class*="comments-count"]',
          'span[aria-label*="comments"]',
          'span[aria-label*="Comments"]',
        ]) || findNumberByLabel('comment');

        const repostsText = trySelectors([
          '.analytics-statistics__reposts',
          '[class*="reposts-count"]',
          'span[aria-label*="reposts"]',
          'span[aria-label*="Reposts"]',
        ]) || findNumberByLabel('repost');

        return {
          impressionsText: trySelectors(selectors.impressions) || findNumberByLabel('discovery') || findNumberByLabel('impressions'),
          uniqueImpressionsText: trySelectors(selectors.uniqueImpressions) || findNumberByLabel('members reached') || findNumberByLabel('unique impression'),
          clicksText: trySelectors(selectors.clicks) || findNumberByLabel('click'),
          engagementRateText: trySelectors(selectors.engagementRate) || findNumberByLabel('engagement rate'),
          savesText: trySelectors(selectors.saves) || findNumberByLabel('saves'),
          profileViewsText: trySelectors(selectors.profileViews) || findNumberByLabel('profile viewer'),
          reactionsText,
          commentsText,
          repostsText,
        };
      })()
    `) as Record<string, string | null>;

    return {
      impressions: parseEngagementNumber(analytics.impressionsText ?? ""),
      uniqueImpressions: parseEngagementNumber(analytics.uniqueImpressionsText ?? ""),
      clicks: parseEngagementNumber(analytics.clicksText ?? ""),
      engagementRate: parseEngagementRate(analytics.engagementRateText ?? ""),
      saves: parseEngagementNumber(analytics.savesText ?? ""),
      profileViews: parseEngagementNumber(analytics.profileViewsText ?? ""),
      followersGained: 0,
      // Return likes/comments/shares from the analytics page too
      likes: parseEngagementNumber(analytics.reactionsText ?? ""),
      comments: parseEngagementNumber(analytics.commentsText ?? ""),
      shares: parseEngagementNumber(analytics.repostsText ?? ""),
    };
  });

  if (result === null) {
    logger.warn("linkedin.enhanced.analytics.scrape.no_cookie.user", { postUrl, workspaceId });
    return null;
  }

  return result;
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

    const profileData = await page.evaluate(`
      (() => {
        function trySelectors(selectorList) {
          for (const selector of selectorList) {
            try {
              const el = document.querySelector(selector);
              if (el) return el.textContent?.trim() ?? null;
            } catch {}
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
      })()
    `) as { followersText: string | null; connectionsText: string | null; profileViewsText: string | null };

    return {
      followerCount: parseEngagementNumber(profileData.followersText ?? ""),
      connectionCount: parseEngagementNumber(profileData.connectionsText ?? ""),
      profileViews: parseEngagementNumber(profileData.profileViewsText ?? ""),
    };
  });

  return result;
}
