import { logger } from "@/lib/logger";
import { withPage, withPersistentPage, delay, loadCookie, saveCookie, CookieExpiredError, OperationTimeoutError, shutdown as shutdownBrowserService, PageOptions } from "@/lib/cloakbrowser";
import type { PlaywrightPage } from "./types";
import { decryptToken } from "@/lib/oauth/crypto";
import { prisma } from "@/lib/prisma";
import { LinkedInCookieExpiredError, LinkedInOperationTimeoutError, LinkedInCaptchaError, scrapeWithRetry, parseLinkedInNumber, parseEngagementRate } from "./scraping-utils";
import { ANALYTICS_SELECTORS, ANALYTICS_DASHBOARD_SELECTORS } from "./selectors";

export { LinkedInCookieExpiredError, LinkedInOperationTimeoutError, LinkedInCaptchaError } from "./scraping-utils";

const LI_AT_COOKIE_ENV = "LINKEDIN_LI_AT_COOKIE";

let liAtCookie: string | undefined;
let liAtCookieTimestamp: number | undefined;
const COOKIE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache TTL

/**
 * Per-workspace rate limiting: tracks last request time per workspace.
 * Enforces minimum 10s between requests to avoid LinkedIn rate limiting.
 */
const RATE_LIMIT_MAP = new Map<string, number>();
const MIN_REQUEST_INTERVAL_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAP_MAX_SIZE = 500;

async function enforceRateLimit(workspaceId: string): Promise<void> {
  const lastRequest = RATE_LIMIT_MAP.get(workspaceId);
  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      const waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
      logger.debug("linkedin.browser.rate_limit_wait", { workspaceId, waitMs: waitTime });
      await delay(waitTime);
    }
  }
  RATE_LIMIT_MAP.set(workspaceId, Date.now());
  // Evict stale entries to prevent unbounded growth
  if (RATE_LIMIT_MAP.size > RATE_LIMIT_MAP_MAX_SIZE) {
    const cutoff = Date.now() - MIN_REQUEST_INTERVAL_MS * 2;
    for (const [key, ts] of RATE_LIMIT_MAP) {
      if (ts < cutoff) RATE_LIMIT_MAP.delete(key);
    }
    // If still over limit after evicting stale entries, evict oldest entries
    if (RATE_LIMIT_MAP.size > RATE_LIMIT_MAP_MAX_SIZE) {
      const sorted = Array.from(RATE_LIMIT_MAP.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = Math.floor(RATE_LIMIT_MAP.size * 0.25);
      for (let i = 0; i < toRemove && i < sorted.length; i++) {
        RATE_LIMIT_MAP.delete(sorted[i][0]);
      }
    }
  }
}

/**
 * Check if the current page URL is a LinkedIn checkpoint/challenge page.
 * Throws LinkedInCaptchaError if detected so callers can handle it.
 */
function assertNotCaptchaPage(page: PlaywrightPage): void {
  const url = page.url();
  if (url.includes("/checkpoint/") || url.includes("/challenge/")) {
    throw new LinkedInCaptchaError(`LinkedIn challenge page detected at ${url}`);
  }
}

/**
 * Navigate to a URL with natural browsing flow:
 * first go to homepage, wait, then go to target URL.
 */
async function naturalNavigation(page: PlaywrightPage, targetUrl: string): Promise<void> {
  await page.goto("https://www.linkedin.com", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await delay(Math.floor(Math.random() * 2000) + 2000); // 2-4 seconds
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  assertNotCaptchaPage(page);
}

function resolveProxyConfig(): { proxy?: string; geoip?: boolean } {
  const proxyUrl = process.env.LINKEDIN_PROXY_URL;
  return {
    proxy: proxyUrl || undefined,
    geoip: !!proxyUrl,
  };
}

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
 * Uses CloakBrowser persistent browser context with humanize mode,
 * natural navigation flow, rate limiting, and CAPTCHA detection.
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

  await enforceRateLimit(workspaceId);

  const proxyConfig = resolveProxyConfig();

  try {
    return await withPersistentPage(
      workspaceId,
      {
        headless: false,
        proxy: proxyConfig.proxy,
        geoip: proxyConfig.geoip,
        timeoutMs: 120000,
        cookies: [{
          name: "li_at",
          value: cookie,
          domain: ".linkedin.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        }],
      },
      async (page) => {
        await naturalNavigation(page, "https://www.linkedin.com");

        const currentUrl = page.url();
        if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
          logger.warn("linkedin.browser.cookie_expired", { url: currentUrl, workspaceId });
          throw new LinkedInCookieExpiredError("LinkedIn session expired — reconnect your account");
        }

        await delay(Math.floor(Math.random() * 3000) + 2000); // 2-5 seconds

        try {
          return await fn(page);
        } catch (err) {
          if (err instanceof LinkedInCaptchaError) {
            logger.error("linkedin.browser.captcha_detected", { url: page.url(), workspaceId });
            throw err;
          }
          if (err instanceof OperationTimeoutError) {
            logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 120000, workspaceId });
            return null as T;
          }
          throw err;
        }
      },
    );
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError || err instanceof LinkedInCaptchaError) {
      throw err;
    }
    if (err instanceof OperationTimeoutError) {
      logger.warn("linkedin.browser.operation_timeout", { timeoutMs: 120000, workspaceId });
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

const SHARE_STABILIZE_DELAY_MS = 3000;

/**
 * Scrape engagement counts from a LinkedIn post page.
 * Uses multiple DOM selector strategies for resilience against UI changes.
 * Returns null if the page is inaccessible (expired cookie, deleted post).
 */
export async function scrapePostAnalytics(postUrl: string): Promise<ScrapedPostAnalytics | null> {
  logger.debug("linkedin.analytics.scrape.start", { postUrl });

  const result = await scrapeWithRetry("scrapePostAnalytics", async (): Promise<ScrapedPostAnalytics | null> => {
    return await withLinkedInPage(async (page) => {
      await naturalNavigation(page, postUrl);
      await delay(SHARE_STABILIZE_DELAY_MS);

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
        likes: parseLinkedInNumber(textCounts.reactionsText ?? ""),
        comments: parseLinkedInNumber(textCounts.commentsText ?? ""),
        shares: parseLinkedInNumber(textCounts.sharesText ?? ""),
      };
    });
  });

  if (result === null) {
    logger.warn("linkedin.analytics.scrape.no_cookie", { postUrl });
    return null;
  }

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

  const result = await scrapeWithRetry("scrapePostAnalyticsForUser", async (): Promise<ScrapedPostAnalytics | null> => {
    return await withLinkedInPageForUser(workspaceId, async (page) => {
      await naturalNavigation(page, postUrl);
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
        likes: parseLinkedInNumber(textCounts.reactionsText ?? ""),
        comments: parseLinkedInNumber(textCounts.commentsText ?? ""),
        shares: parseLinkedInNumber(textCounts.sharesText ?? ""),
      };
    });
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

  const result = await scrapeWithRetry("scrapeEnhancedPostAnalytics", async (): Promise<EnhancedLinkedInPostAnalytics | null> => {
    return await withLinkedInPage(async (page) => {
      await naturalNavigation(page, postUrl);
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
        impressions: parseLinkedInNumber(analytics.impressionsText ?? ""),
        uniqueImpressions: parseLinkedInNumber(analytics.uniqueImpressionsText ?? ""),
        clicks: parseLinkedInNumber(analytics.clicksText ?? ""),
        engagementRate: parseEngagementRate(analytics.engagementRateText ?? ""),
        saves: parseLinkedInNumber(analytics.savesText ?? ""),
        profileViews: parseLinkedInNumber(analytics.profileViewsText ?? ""),
        followersGained: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
    });
  });

  if (result === null) {
    logger.warn("linkedin.enhanced.analytics.scrape.no_cookie", { postUrl });
    return null;
  }

  const basicAnalytics = await scrapePostAnalytics(postUrl);
  if (!basicAnalytics) {
    logger.warn("linkedin.enhanced.basic.analytics.failed", { postUrl });
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

  const result = await scrapeWithRetry("scrapeProfileData", async (): Promise<LinkedInProfileData | null> => {
    return await withLinkedInPage(async (page) => {
      await naturalNavigation(page, profileUrl);
      await delay(2000);

      const currentUrl = page.url();
      if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
        logger.warn("linkedin.profile.scrape.cookie_expired", { url: currentUrl });
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
        followerCount: parseLinkedInNumber(profileData.followersText ?? ""),
        connectionCount: parseLinkedInNumber(profileData.connectionsText ?? ""),
        profileViews: parseLinkedInNumber(profileData.profileViewsText ?? ""),
      };
    });
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

  const result = await scrapeWithRetry("scrapeEnhancedPostAnalyticsForUser", async (): Promise<EnhancedLinkedInPostAnalytics | null> => {
    return await withLinkedInPageForUser(workspaceId, async (page) => {
      await naturalNavigation(page, postUrl);
      await delay(5000);

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

          // Helper to find analytics values in the LinkedIn analytics dashboard
          // Looks for specific patterns like "18\ncomments" or "reactions\n18"
          function findAnalyticsValue(patterns) {
            for (const pattern of patterns) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].toLowerCase();
                // Check if this line matches the label pattern
                if (line.includes(pattern.label)) {
                  // Look for number in previous line (e.g., "18" followed by "comments")
                  if (i > 0 && pattern.lookPrev) {
                    const prevMatch = lines[i - 1].match(/^([\\d,]+\\.?\\d*\\s*[kKmM]?%?)$/);
                    if (prevMatch) return prevMatch[1];
                  }
                  // Look for number in same line (e.g., "18 comments")
                  if (pattern.lookSame) {
                    const sameMatch = lines[i].match(/([\\d,]+\\.?\\d*\\s*[kKmM]?)/);
                    if (sameMatch) return sameMatch[1];
                  }
                  // Look for number in next line (e.g., "comments" followed by "18")
                  if (i + 1 < lines.length && pattern.lookNext) {
                    const nextMatch = lines[i + 1].match(/^([\\d,]+\\.?\\d*\\s*[kKmM]?%?)$/);
                    if (nextMatch) return nextMatch[1];
                  }
                }
              }
            }
            return null;
          }

          // Try to find the analytics section first - it contains the engagement metrics
          // Look for section headers or containers that contain the analytics
          const analyticsSection = document.querySelector('[class*="analytics"], [class*="Analytics"], [data-test-id*="analytics"]');
          const sectionText = analyticsSection ? analyticsSection.innerText : allText;
          const sectionLines = sectionText.split('\\n').map(l => l.trim()).filter(Boolean);

          // Use section lines if found, otherwise fall back to all lines
          const searchLines = sectionLines.length > 0 ? sectionLines : lines;

          // Improved number extraction with stricter matching to avoid duplicate values
          function findNumberByLabelInLines(label, targetLines) {
            for (let i = 0; i < targetLines.length; i++) {
              const line = targetLines[i].toLowerCase().trim();

              // Only match exact label or label with word boundaries
              const exactMatch = line === label ||
                                 line === label + 's' ||
                                 (' ' + line + ' ').includes(' ' + label + ' ');

              if (!exactMatch) continue;

              // Priority 1: Check if number is in the same line (e.g., "18 comments")
              const sameMatch = line.match(/^([\d,]+)/) || line.match(/([\d,]+)$/);
              if (sameMatch) return sameMatch[1];

              // Priority 2: Check previous line (number usually appears BEFORE label)
              if (i > 0) {
                const prevLine = targetLines[i - 1].trim();
                const prevMatch = prevLine.match(/^([\d,]+\.?\d*\s*[kKmM]?%?)$/);
                if (prevMatch) return prevMatch[1];
              }

              // Priority 3: Check next line ONLY if it's a standalone number
              if (i + 1 < targetLines.length) {
                const nextLine = targetLines[i + 1].trim();
                const nextMatch = nextLine.match(/^([\d,]+\.?\d*\s*[kKmM]?%?)$/);
                // Only accept if it's a short standalone number (not another label)
                if (nextMatch && !nextLine.includes(' ') && nextLine.length <= 10) {
                  return nextMatch[1];
                }
              }
            }
            return null;
          }

          // First try specific CSS selectors for the analytics dashboard
          const reactionsText = trySelectors([
            '.analytics-statistics__reactions',
            '[class*="reactions-count"]',
            'span[aria-label*="reactions"]',
            'span[aria-label*="Reactions"]',
            '[class*="analytics-statistics"] [class*="reactions"]',
          ]) || findNumberByLabelInLines('reactions', searchLines) || findNumberByLabelInLines('reaction', searchLines);

          const commentsText = trySelectors([
            '.analytics-statistics__comments',
            '[class*="comments-count"]',
            'span[aria-label*="comments"]',
            'span[aria-label*="Comments"]',
            '[class*="analytics-statistics"] [class*="comments"]',
          ]) || findNumberByLabelInLines('comments', searchLines) || findNumberByLabelInLines('comment', searchLines);

          const repostsText = trySelectors([
            '.analytics-statistics__reposts',
            '[class*="reposts-count"]',
            'span[aria-label*="reposts"]',
            'span[aria-label*="Reposts"]',
            '[class*="analytics-statistics"] [class*="reposts"]',
          ]) || findNumberByLabelInLines('reposts', searchLines) || findNumberByLabelInLines('repost', searchLines);

          return {
            impressionsText: trySelectors(selectors.impressions) || findNumberByLabelInLines('discovery', searchLines) || findNumberByLabelInLines('impressions', searchLines),
            uniqueImpressionsText: trySelectors(selectors.uniqueImpressions) || findNumberByLabelInLines('members reached', searchLines) || findNumberByLabelInLines('unique impression', searchLines),
            clicksText: trySelectors(selectors.clicks) || findNumberByLabelInLines('click', searchLines),
            engagementRateText: trySelectors(selectors.engagementRate) || findNumberByLabelInLines('engagement rate', searchLines),
            savesText: trySelectors(selectors.saves) || findNumberByLabelInLines('saves', searchLines),
            profileViewsText: trySelectors(selectors.profileViews) || findNumberByLabelInLines('profile viewer', searchLines),
            reactionsText,
            commentsText,
            repostsText,
          };
        })()
      `) as Record<string, string | null>;

      const parsedResult = {
        impressions: parseLinkedInNumber(analytics.impressionsText ?? ""),
        uniqueImpressions: parseLinkedInNumber(analytics.uniqueImpressionsText ?? ""),
        clicks: parseLinkedInNumber(analytics.clicksText ?? ""),
        engagementRate: parseEngagementRate(analytics.engagementRateText ?? ""),
        saves: parseLinkedInNumber(analytics.savesText ?? ""),
        profileViews: parseLinkedInNumber(analytics.profileViewsText ?? ""),
        followersGained: 0,
        likes: parseLinkedInNumber(analytics.reactionsText ?? ""),
        comments: parseLinkedInNumber(analytics.commentsText ?? ""),
        shares: parseLinkedInNumber(analytics.repostsText ?? ""),
      };

      // Debug logging to help diagnose extraction issues
      logger.debug("linkedin.enhanced.analytics.scrape.raw_values", {
        postUrl,
        workspaceId,
        reactionsText: analytics.reactionsText,
        commentsText: analytics.commentsText,
        repostsText: analytics.repostsText,
        impressionsText: analytics.impressionsText,
        engagementRateText: analytics.engagementRateText,
      });

      // Validate extracted data - warn if suspicious patterns detected
      if (parsedResult.likes === parsedResult.comments && parsedResult.likes > 0) {
        logger.warn("linkedin.enhanced.analytics.scrape.suspicious_data", {
          postUrl,
          workspaceId,
          issue: "likes_equals_comments",
          likes: parsedResult.likes,
          comments: parsedResult.comments,
        });
      }
      if (parsedResult.comments > parsedResult.likes) {
        logger.warn("linkedin.enhanced.analytics.scrape.suspicious_data", {
          postUrl,
          workspaceId,
          issue: "comments_exceed_likes",
          likes: parsedResult.likes,
          comments: parsedResult.comments,
        });
      }

      return parsedResult;
    });
  });

  if (result === null) {
    logger.warn("linkedin.enhanced.analytics.scrape.no_cookie.user", { postUrl, workspaceId });
    return null;
  }

  logger.debug("linkedin.enhanced.analytics.scrape.complete.user", {
    postUrl,
    workspaceId,
    impressions: result.impressions,
    likes: result.likes,
    comments: result.comments,
    shares: result.shares,
    engagementRate: result.engagementRate,
  });

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

  const result = await scrapeWithRetry("scrapeProfileDataForUser", async (): Promise<LinkedInProfileData | null> => {
    return await withLinkedInPageForUser(workspaceId, async (page) => {
      await naturalNavigation(page, profileUrl);
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
        followerCount: parseLinkedInNumber(profileData.followersText ?? ""),
        connectionCount: parseLinkedInNumber(profileData.connectionsText ?? ""),
        profileViews: parseLinkedInNumber(profileData.profileViewsText ?? ""),
      };
    });
  });

  return result;
}
