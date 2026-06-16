import { withLinkedInPageForUser } from "./browser";
import { POST_CONTAINER_SELECTORS } from "./selectors";
import { extractPostUrnFromUrl, normalizeUrl, delay, withRetry, isLinkedInLoginPage, triggerSelfHealerForScraper } from "./scraping-utils";
import { logger } from "@/lib/logger";
import type { ProcessContext } from "@/lib/processes/process-context";

export interface ScrapedPost {
  urn: string;
  url: string;
  text: string;
  timestamp: Date | null;
}

export interface ScrapePostsOptions {
  pageUrl: string;
  scrollIterations?: number;
  maxPosts?: number;
  timeoutMs?: number;
  activityPage?: boolean;
}

const DEFAULT_SCROLL_ITERATIONS = 30; // Increased for 3 months of data
const DEFAULT_MAX_POSTS = 100; // Increased for 3 months of data
const DEFAULT_TIMEOUT_MS = 30000;
const FEED_STABILIZE_DELAY_MS = 5000;
const POST_CONTAINER_TIMEOUT_MS = 15000;
const SHOW_MORE_DELAY_MS = 2000;

/**
 * Try multiple CSS selectors to find elements on the page.
 * Returns the first selector that finds elements, or null if none match.
 */
async function trySelectors(
  page: { $: (selector: string) => Promise<any> },
  selectors: readonly string[],
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) return selector;
    } catch {
      // Selector syntax error, try next
    }
  }
  return null;
}

/**
 * Consolidated LinkedIn post scraper.
 *
 * Replaces the duplicated scrapeUserPosts() implementations in both
 * lib/inbox/scrapers/linkedin-scraper.ts and lib/analytics/linkedin-import.ts.
 *
 * Usage:
 * - Feed page: scrapePosts(workspaceId, { pageUrl: "...", activityPage: false })
 * - Activity page: scrapePosts(workspaceId, { pageUrl: "...", activityPage: true })
 */
export async function scrapePosts(
  workspaceId: string,
  options: ScrapePostsOptions,
  ctx?: ProcessContext,
): Promise<ScrapedPost[]> {
  const {
    pageUrl,
    scrollIterations = DEFAULT_SCROLL_ITERATIONS,
    maxPosts = DEFAULT_MAX_POSTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    activityPage = false,
  } = options;

  ctx?.log('info', 'Post scraper started', { pageUrl, scrollIterations, maxPosts });

  logger.info("linkedin.post_scraper.start", {
    workspaceId,
    pageUrl,
    scrollIterations,
    maxPosts,
    activityPage,
  });

  await ctx?.reportProgress(0, 'Navigating to page...');

  const result = await withRetry(
    "scrapePosts",
    async () =>
      withLinkedInPageForUser(workspaceId, async (page) => {
        const posts: ScrapedPost[] = [];

        // Navigate to the target page
        await page.goto(pageUrl, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });

        // Check for cookie-expired redirect
        const currentUrl = page.url();
        if (isLinkedInLoginPage(currentUrl)) {
          logger.error("linkedin.post_scraper.cookie_expired", { url: currentUrl });
          throw new Error(
            "LinkedIn cookie expired — please re-run scripts/extract-linkedin-cookie.mjs",
          );
        }

        // Wait for page to stabilize
        await delay(FEED_STABILIZE_DELAY_MS);

        await ctx?.reportProgress(20, 'Looking for posts...');

        // Auto-scroll to trigger lazy loading of more posts
        // Pass an abort-aware scroll function that checks for external cancellation
        await page.evaluate(({ iterations }) => {
          return new Promise<void>((resolve) => {
            let scrollCount = 0;
            const scrollInterval = setInterval(() => {
              // Check if the page is still valid before scrolling
              // If document.hidden or page closed, stop immediately
              if (document.hidden) {
                clearInterval(scrollInterval);
                resolve();
                return;
              }
              window.scrollBy(0, window.innerHeight);
              scrollCount++;
              if (scrollCount >= iterations) {
                clearInterval(scrollInterval);
                resolve();
              }
            }, 1000);
          });
        }, { iterations: scrollIterations });
        await delay(2000);

        // Discover post containers using the shared selector list
        const workingSelector = await trySelectors(page, POST_CONTAINER_SELECTORS);
        if (!workingSelector) {
          logger.warn("linkedin.post_scraper.no_posts_found", {
            tried: POST_CONTAINER_SELECTORS,
          });
          return posts;
        }

        logger.info("linkedin.post_scraper.post_selector_found", { selector: workingSelector });

        // Wait for post containers to appear
        try {
          await page.waitForSelector(workingSelector, { timeout: POST_CONTAINER_TIMEOUT_MS });
        } catch {
          logger.warn("linkedin.post_scraper.post_wait_timeout", { selector: workingSelector });
          return posts;
        }

        // Extract post data from each container
        const postData = await page.evaluate(
          ({ selector, limit, isActivityPage }) => {
            const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit);
            return elements.map((el) => {
              let url: string | null = null;
              let urn: string | null = null;

              // Activity page: extract URN from data-urn attribute
              if (isActivityPage) {
                const dataUrn = el.getAttribute("data-urn");
                if (dataUrn) {
                  urn = dataUrn;
                  url = `https://www.linkedin.com/feed/update/${dataUrn}/`;
                }
              }

              // Fallback: search links for URN
              if (!urn) {
                if (isActivityPage) {
                  // Activity page: search all links for urn:li:share or urn:li:activity in hrefs
                  const allLinks = Array.from(el.querySelectorAll("a"));
                  for (const a of allLinks) {
                    const href = a.getAttribute("href") || "";
                    if (href.includes("urn:li:share") || href.includes("urn:li:activity")) {
                      url = a.href;
                      break;
                    }
                  }
                } else {
                  // Feed page: use simple selector for post links
                  const link = el.querySelector(
                    "a[href*='feed/update'], a[href*='activity'], a[href*='/posts/']",
                  );
                  url = link ? (link as HTMLAnchorElement).href : null;
                }
              }

              // Find the post text - try multiple strategies
              let text = "";
              
              // Strategy 1: Look for <p> elements with substantial text (new LinkedIn structure)
              const pElements = Array.from(el.querySelectorAll("p"));
              for (const p of pElements) {
                const pText = (p as HTMLElement).innerText?.trim() || "";
                // Skip short text like author names, timestamps
                if (pText.length > 50 && !/^\d+\s*(min|hour|day|week|month|yr|sec|من)/i.test(pText)) {
                  text = pText;
                  break;
                }
              }
              
              // Strategy 2: Legacy selectors
              if (!text) {
                const textEl = el.querySelector(
                  "div.feed-shared-text, span.break-words, div.attributed-text-segment-list__content, span[class*='main-content']",
                );
                text = textEl ? (textEl as HTMLElement).innerText?.trim() : "";
              }

              // Find timestamp - try multiple strategies
              let datetime: string | null = null;
              
              // Strategy 1: Look for <time> element with datetime attribute
              const timeEl = el.querySelector("time");
              if (timeEl) {
                datetime = (timeEl as HTMLTimeElement).dateTime;
              }
              
              // Strategy 2: Look for text patterns like "X minutes/hours/days ago" or Arabic equivalents
              if (!datetime) {
                const allElements = Array.from(el.querySelectorAll("*"));
                for (const elem of allElements) {
                  const t = (elem as HTMLElement).textContent || "";
                  // English patterns
                  if (/\d+\s*(min|hour|day|week|month|year)s?\s*ago/i.test(t) && t.length < 30) {
                    // Can't extract exact datetime from relative time, but we found it
                    break;
                  }
                  // Arabic patterns
                  if (/\d+\s*(من الدقائق|من الساعات|من الأيام|من الأسابيع|من الأشهر)/.test(t) && t.length < 30) {
                    break;
                  }
                }
              }

              return { url, text, datetime };
            });
          },
          { selector: workingSelector, limit: maxPosts, isActivityPage: activityPage },
        );

        await ctx?.reportPostsFound(postData.length);
        await ctx?.reportProgress(30, `Found ${postData.length} posts, extracting...`);

        for (let i = 0; i < postData.length; i++) {
          const pd = postData[i];
          ctx?.throwIfCancelled();

          if (i % 5 === 0 || i === postData.length - 1) {
            await ctx?.reportProgress(30 + Math.round((i / postData.length) * 60), `Processing post ${i + 1} of ${postData.length}`);
            await ctx?.reportPostsProcessed(i + 1);
          }

          if (!pd.url) continue;
          const urn = extractPostUrnFromUrl(pd.url);
          if (!urn) continue;

          posts.push({
            urn,
            url: normalizeUrl(pd.url),
            text: pd.text,
            timestamp: pd.datetime ? new Date(pd.datetime) : null,
          });
        }

        logger.info("linkedin.post_scraper.complete", {
          workspaceId,
          postsFound: posts.length,
        });

        return posts;
      }),
    3, // maxRetries
    "inbox", // selfHealerTarget
    workspaceId,
  );

  await ctx?.reportProgress(100, 'Complete');

  return result ?? [];
}
