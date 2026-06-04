/**
 * Bulletproof LinkedIn Creator Analytics scraper.
 *
 * Uses text-based extraction instead of CSS selectors because LinkedIn uses
 * obfuscated hashed class names (e.g., _38c8bff9) that change randomly.
 *
 * The Creator Dashboard at /analytics/creator/content/ provides:
 * - Aggregate metrics (impressions, reach, engagement breakdown)
 * - Per-post metrics (impressions, engagements for each post)
 * - Time range filtering
 *
 * This module extracts both aggregate dashboard data AND per-post metrics,
 * then optionally visits individual post analytics pages for detailed metrics.
 *
 * NOTE: All page.evaluate() calls use string-based evaluation to avoid
 * tsx __name helper injection issues with Playwright's function serialization.
 */
import { logger } from "@/lib/logger";
import { withLinkedInPageForUser } from "@/lib/linkedin/browser";
import type { EnhancedLinkedInPostAnalytics } from "@/lib/linkedin/browser";

const CREATOR_ANALYTICS_URL = "https://www.linkedin.com/analytics/creator/content/";
const PAGE_LOAD_TIMEOUT_MS = 30000;
const RENDER_STABILIZE_DELAY_MS = 8000;
const SCROLL_STABILIZE_DELAY_MS = 3000;

/**
 * Aggregate metrics from the Creator Dashboard.
 */
export interface CreatorDashboardAggregate {
  impressions: number;
  membersReached: number;
  socialEngagements: number;
  reactions: number;
  comments: number;
  reposts: number;
  saves: number;
  sendsOnLinkedIn: number;
  impressionsChangePercent: number | null;
}

/**
 * Per-post metrics from the Creator Dashboard.
 */
export interface CreatorDashboardPost {
  urn: string;
  analyticsUrl: string | null;
  feedUrl: string | null;
  impressions: number;
  engagements: number;
  textPreview: string;
}

/**
 * Complete Creator Dashboard data.
 */
export interface CreatorDashboardData {
  timeRange: string;
  aggregate: CreatorDashboardAggregate | null;
  posts: CreatorDashboardPost[];
  rawText: string;
}

/**
 * Parse a number string that may contain commas, K/M suffixes, or percentage signs.
 */
function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, "").trim();
  const numMatch = cleaned.match(/^(-?\d+\.?\d*)\s*([kKmMbB%])?$/);
  if (!numMatch) return 0;
  let num = parseFloat(numMatch[1]);
  const suffix = numMatch[2]?.toLowerCase();
  if (suffix === "k") num *= 1000;
  else if (suffix === "m") num *= 1000000;
  else if (suffix === "b") num *= 1000000000;
  return Math.round(num);
}

/**
 * Extract a number that appears on the line before a specific label.
 */
function findNumberByLabel(lines: string[], label: string, lookBefore: boolean = true): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(label.toLowerCase())) {
      if (lookBefore && i > 0) {
        const prevLine = lines[i - 1].trim();
        if (/^[\d,]+\.?\d*\s*[kKmMbB%+-]*$/.test(prevLine) || /^-?\d+(\.\d+)?%?$/.test(prevLine)) {
          return prevLine;
        }
      }
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^[\d,]+\.?\d*\s*[kKmMbB%+-]*$/.test(nextLine) || /^-?\d+(\.\d+)?%?$/.test(nextLine)) {
          return nextLine;
        }
      }
      const sameLineMatch = lines[i].match(/([\d,]+\.?\d*\s*[kKmMbB])/);
      if (sameLineMatch) return sameLineMatch[1];
    }
  }
  return null;
}

/**
 * Find percentage change that appears near a label.
 */
function findPercentChange(lines: string[], label: string): number | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(label.toLowerCase())) {
      const range = 3;
      for (let j = Math.max(0, i - range); j <= Math.min(lines.length - 1, i + range); j++) {
        const nearby = lines[j].trim();
        const match = nearby.match(/^([+-]?\d+)%$/);
        if (match) return parseInt(match[1], 10);
      }
    }
  }
  return null;
}

/**
 * Extract aggregate metrics from the Creator Dashboard text.
 */
function extractAggregateMetrics(fullText: string): CreatorDashboardAggregate | null {
  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

  const impressionsText = findNumberByLabel(lines, "impressions", true);
  const membersReachedText = findNumberByLabel(lines, "members reached", true);
  const socialEngagementsText = findNumberByLabel(lines, "social engagements", true);
  const reactionsText = findNumberByLabel(lines, "reactions", true);
  const commentsText = findNumberByLabel(lines, "comments", true);
  const repostsText = findNumberByLabel(lines, "reposts", true);
  const savesText = findNumberByLabel(lines, "saves", true);
  const sendsOnLinkedInText = findNumberByLabel(lines, "sends on linkedin", true);
  const impressionsChangePercent = findPercentChange(lines, "vs") ?? findPercentChange(lines, "prior");

  return {
    impressions: parseNumber(impressionsText ?? "0"),
    membersReached: parseNumber(membersReachedText ?? "0"),
    socialEngagements: parseNumber(socialEngagementsText ?? "0"),
    reactions: parseNumber(reactionsText ?? "0"),
    comments: parseNumber(commentsText ?? "0"),
    reposts: parseNumber(repostsText ?? "0"),
    saves: parseNumber(savesText ?? "0"),
    sendsOnLinkedIn: parseNumber(sendsOnLinkedInText ?? "0"),
    impressionsChangePercent,
  };
}

/**
 * Extract per-post data from the Creator Dashboard.
 */
function extractPostDataFromDOM(pageText: string, domData: { posts: Array<{ urn: string; analyticsUrl: string | null; feedUrl: string | null; impressions: number; engagements: number; textPreview: string }> }): CreatorDashboardPost[] {
  return domData.posts;
}

/**
 * JavaScript code to extract post data from the Creator Dashboard DOM.
 * Used as a string in page.evaluate() to avoid tsx __name injection.
 */
const EXTRACT_POSTS_JS = `
(() => {
  const parseDomNumber = (str) => {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, "").trim();
    const numMatch = cleaned.match(/^(-?\\d+\\.?\\d*)\\s*([kKmMbB%])?$/);
    if (!numMatch) return 0;
    let num = parseFloat(numMatch[1]);
    const suffix = numMatch[2];
    if (!suffix) return Math.round(num);
    const s = suffix.toLowerCase();
    if (s === "k") num *= 1000;
    else if (s === "m") num *= 1000000;
    else if (s === "b") num *= 1000000000;
    return Math.round(num);
  };

  const posts = [];
  const analyticsLinks = Array.from(document.querySelectorAll('a[href*="/analytics/post-summary/"]'));

  for (const link of analyticsLinks) {
    const href = link.getAttribute("href") || "";
    if (!href.includes("urn:li:")) continue;

    const urnMatch = href.match(/urn:li:(activity|share|ugcPost):\\d+/);
    if (!urnMatch) continue;
    const urn = urnMatch[0];

    const parent = link.closest('[class*="card"], [class*="row"], [class*="item"], article');
    let feedUrl = null;
    if (parent) {
      const feedLinks = Array.from(parent.querySelectorAll('a[href*="/feed/update/"]'));
      if (feedLinks.length > 0) {
        feedUrl = feedLinks[0].getAttribute("href");
      }
    }

    const textContainer = parent || link.parentElement?.parentElement || link;
    const fullText = textContainer?.innerText || "";
    const textLines = fullText.split("\\n").map(l => l.trim()).filter(Boolean);

    let impressions = 0;
    let engagements = 0;
    let textPreview = "";

    for (const line of textLines) {
      const combinedMatch = line.match(/^([\\d,]+)\\s+impressions?\\s*[\\u2022\\u00b7\\-\\u2013]\\s*([\\d,]+)\\s+engagements?$/i);
      if (combinedMatch) {
        impressions = parseDomNumber(combinedMatch[1]);
        engagements = parseDomNumber(combinedMatch[2]);
        continue;
      }
      const impressionsMatch = line.match(/^([\\d,]+)\\s+impressions?$/i);
      if (impressionsMatch) {
        impressions = parseDomNumber(impressionsMatch[1]);
        continue;
      }
      const engagementsMatch = line.match(/^([\\d,]+)\\s+engagements?$/i);
      if (engagementsMatch) {
        engagements = parseDomNumber(engagementsMatch[1]);
        continue;
      }
      if (line.length > 10 && line.length < 200 && !/^\\d/.test(line) && !line.toLowerCase().includes("view analytics")) {
        textPreview = textPreview || line;
      }
    }

    posts.push({ urn, analyticsUrl: href, feedUrl, impressions, engagements, textPreview });
  }

  return { posts };
})()
`;

/**
 * Time range options available on the Creator Dashboard.
 */
export type TimeRange = "7 days" | "14 days" | "28 days" | "90 days" | "365 days" | "Custom";

/**
 * JavaScript to select a time range on the Creator Dashboard.
 * First opens the dropdown, then clicks the desired option.
 */
const SELECT_TIME_RANGE_JS = (timeRange: string) => `
  (() => {
    // Step 1: Open dropdown by clicking current time range button
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      const text = (el.textContent || '').trim();
      if (/^\\d+\\s+days?$/.test(text) && el.getAttribute('role') === 'button' && el.childElementCount < 5) {
        el.click();
        break;
      }
    }
    return 'dropdown opened';
  })()
`;

const CLICK_TIME_RANGE_JS = (timeRange: string) => `
  (() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      const text = (el.textContent || '').trim();
      if (text === '${timeRange}' && el.childElementCount < 5 && el.tagName !== 'BODY') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.click();
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
          el.dispatchEvent(new PointerEvent('click', { bubbles: true }));
          return 'clicked';
        }
      }
    }
    return 'not found';
  })()
`;

async function selectTimeRange(page: any, timeRange: string): Promise<void> {
  await page.evaluate(SELECT_TIME_RANGE_JS(timeRange));
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(CLICK_TIME_RANGE_JS(timeRange));
}

/**
 * Scrape the LinkedIn Creator Dashboard for aggregate metrics and per-post data.
 * Defaults to 90 days for comprehensive analytics.
 */
export async function scrapeCreatorDashboardForUser(
  workspaceId: string,
  timeRange: TimeRange = "90 days",
): Promise<CreatorDashboardData | null> {
  logger.debug("linkedin.creator.dashboard.scrape.start", { workspaceId, timeRange });

  const result = await withLinkedInPageForUser(workspaceId, async (page) => {
    await page.goto(CREATOR_ANALYTICS_URL, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    await new Promise((r) => setTimeout(r, RENDER_STABILIZE_DELAY_MS));

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/uas/oauth")) {
      throw new Error("LinkedIn session expired");
    }

    // Select time range
    await selectTimeRange(page, timeRange);
    await new Promise((r) => setTimeout(r, 10000));

    // Scroll down to load all posts
    await page.evaluate(`
      (async () => {
        for (let i = 0; i < 15; i++) {
          window.scrollBy(0, window.innerHeight);
          await new Promise(r => setTimeout(r, 800));
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, SCROLL_STABILIZE_DELAY_MS));

    // Extract post links from DOM using string-based evaluate
    const domData = await page.evaluate(EXTRACT_POSTS_JS) as {
      posts: Array<{ urn: string; analyticsUrl: string | null; feedUrl: string | null; impressions: number; engagements: number; textPreview: string }>;
    };

    // Get full page text for aggregate metrics
    const fullText = await page.evaluate("document.body?.innerText || ''") as string;

    // Extract aggregate metrics
    const aggregate = extractAggregateMetrics(fullText);

    // Get time range from page
    const actualTimeRange = await page.evaluate(`
      (() => {
        const allText = document.body?.innerText || "";
        const lines = allText.split("\\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (/^\\d+\\s+(day|week|month)s?$/i.test(line)) return line;
        }
        return "unknown";
      })()
    `) as string;

    logger.debug("linkedin.creator.dashboard.scrape.complete", {
      workspaceId,
      timeRange: actualTimeRange,
      aggregateMetrics: aggregate,
      postCount: domData.posts.length,
    });

    return {
      timeRange: actualTimeRange,
      aggregate,
      posts: domData.posts,
      rawText: fullText,
    };
  });

  if (result === null) {
    logger.warn("linkedin.creator.dashboard.scrape.no_cookie", { workspaceId });
    return null;
  }

  // Self-healer trigger: if no posts found when page loaded, trigger DOM check
  if (result.posts.length === 0 && result.aggregate !== null) {
    logger.warn("linkedin.creator.dashboard.scrape.empty_posts", { workspaceId, timeRange });
    // Fire-and-forget: trigger self-healer in background
    import("@/lib/agent/self-healer/trigger").then(({ triggerSelfHealer }) =>
      triggerSelfHealer("creator-dashboard", workspaceId).catch(() => {}),
    ).catch(() => {});
  }

  return result;
}

/**
 * Enhanced per-post analytics that combines Creator Dashboard data with detailed metrics.
 */
export interface EnrichedPostAnalytics extends EnhancedLinkedInPostAnalytics {
  urn: string;
  textPreview: string;
  source: "creator_dashboard" | "individual_analytics";
}

/**
 * Scrape the Creator Dashboard and then enrich each post with detailed analytics
 * by visiting individual post analytics pages.
 */
export async function scrapeCreatorDashboardWithDetails(
  workspaceId: string,
  timeRange: TimeRange = "90 days",
): Promise<EnrichedPostAnalytics[] | null> {
  logger.debug("linkedin.creator.dashboard.enriched.start", { workspaceId, timeRange });

  // Step 1: Get the Creator Dashboard data
  const dashboardData = await scrapeCreatorDashboardForUser(workspaceId, timeRange);
  if (!dashboardData) {
    return null;
  }

  if (dashboardData.posts.length === 0) {
    logger.debug("linkedin.creator.dashboard.enriched.no_posts", { workspaceId });
    return [];
  }

  // Step 2: Enrich each post with detailed analytics
  const enriched: EnrichedPostAnalytics[] = [];

  for (const post of dashboardData.posts) {
    try {
      let detailed: EnhancedLinkedInPostAnalytics | null = null;

      // Try the analytics page URL first
      if (post.analyticsUrl) {
        const { scrapeEnhancedPostAnalyticsForUser } = await import("@/lib/linkedin/browser");
        const fullUrl = post.analyticsUrl.startsWith("http")
          ? post.analyticsUrl
          : `https://www.linkedin.com${post.analyticsUrl}`;
        detailed = await scrapeEnhancedPostAnalyticsForUser(workspaceId, fullUrl);
      }

      if (detailed && detailed.impressions > 0) {
        enriched.push({
          ...detailed,
          urn: post.urn,
          textPreview: post.textPreview,
          source: "individual_analytics",
          impressions: Math.max(detailed.impressions, post.impressions),
          likes: Math.max(detailed.likes, post.engagements > 0 ? Math.round(post.engagements * 0.8) : 0),
        });
      } else if (post.impressions > 0 || post.engagements > 0) {
        // Use Creator Dashboard data as fallback
        enriched.push({
          impressions: post.impressions,
          uniqueImpressions: 0,
          clicks: 0,
          engagementRate: post.engagements > 0 && post.impressions > 0
            ? post.engagements / post.impressions
            : 0,
          saves: 0,
          profileViews: 0,
          followersGained: 0,
          likes: Math.round(post.engagements * 0.8),
          comments: Math.round(post.engagements * 0.1),
          shares: Math.round(post.engagements * 0.1),
          urn: post.urn,
          textPreview: post.textPreview,
          source: "creator_dashboard",
        });
      }
    } catch (error) {
      logger.warn("linkedin.creator.dashboard.enriched.single_post_failed", {
        workspaceId,
        urn: post.urn,
        error: String(error),
      });
    }
  }

  logger.debug("linkedin.creator.dashboard.enriched.complete", {
    workspaceId,
    postCount: enriched.length,
    fromIndividual: enriched.filter((p) => p.source === "individual_analytics").length,
    fromDashboard: enriched.filter((p) => p.source === "creator_dashboard").length,
  });

  return enriched;
}
