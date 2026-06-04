import { logger } from "@/lib/logger";
import type { RawComment, RawMention, RawDM } from "@/lib/inbox/types";
import { withLinkedInPage, extractLiAtCookie, shutdownBrowser, LinkedInCookieExpiredError } from "@/lib/linkedin/browser";

// ─── Configuration ────────────────────────────────────────────────
const MAX_POSTS_PER_SYNC = 10;
const MAX_COMMENTS_PER_POST = 50;
const DELAY_BETWEEN_PAGES_MS = 2500;
const PAGE_LOAD_TIMEOUT_MS = 30000;
const COMMENT_SECTION_TIMEOUT_MS = 15000;
const FEED_STABILIZE_DELAY_MS = 5000;

// ─── Retry Configuration ──────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function isRetryableError(err: unknown): boolean {
  if (err instanceof LinkedInCookieExpiredError) return false;
  if (err instanceof Error && err.name === "LinkedInOperationTimeoutError") return true;
  return true;
}

async function delayWithBackoff(attempt: number): Promise<void> {
  const backoffMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  await new Promise((resolve) => setTimeout(resolve, backoffMs + Math.random() * 200));
}

async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LinkedInCookieExpiredError) {
        logger.warn("linkedin.scraper.cookie_expired", { operation, error: err.message });
        return null;
      }
      if (attempt < maxRetries && isRetryableError(err)) {
        logger.warn("linkedin.scraper.retry_attempt", {
          operation,
          attempt: attempt + 1,
          maxRetries,
          error: String(err),
        });
        await delayWithBackoff(attempt);
  } else {
    logger.error("linkedin.scraper.operation_failed", {
      operation,
      attempts: attempt + 1,
      error: String(err),
    });

    // Self-healer trigger: after all retries exhausted, trigger DOM check
    if (attempt >= maxRetries) {
      logger.warn("linkedin.scraper.triggering_self_healer", { operation, maxRetries });
      import("@/lib/agent/self-healer/trigger").then(({ triggerSelfHealer }) =>
        triggerSelfHealer("inbox").catch(() => {}),
      ).catch(() => {});
    }

    return null;
  }
    }
  }
  return null;
}

// ─── LinkedIn DOM Selectors (multiple fallback strategies) ────────
// LinkedIn frequently changes class names. We use multiple strategies:
// 1. BEM-style class patterns (relatively stable)
// 2. Attribute-based selectors (data-* attributes)
// 3. Structural selectors (parent-child relationships)
// Note: Playwright :has-text() selectors do NOT work with page.$().
// For text-based matching, use the trySelectorsWithText fallback.
const SELECTOR_STRATEGIES = {
  // Strategy 1: BEM class patterns (most common)
  postContainers: [
    "div.feed-shared-update-v2",
    "article[data-view-name='update']",
    "div.update-components-container",
    "div.occludable-update",
  ],
  // Strategy 2: Comment item selectors
  commentItems: [
    "div.comments-comment-item",
    "div.comment-item",
    "div.social-detail-comment",
    "li.comments-comment-item",
    "div[data-urn*='comment']",
  ],
  // Strategy 3: Post link patterns
  postLinks: [
    "a[href*='/feed/update/']",
    "a[href*='/posts/']",
    "a[data-control-name='view_post_detail']",
  ],
  // Strategy 4: Comment text
  commentText: [
    "span.comments-comment-item__main-content",
    "span[class*='main-content']",
    "div[class*='comment-text']",
    "span[class*='break-words']",
    "div[class*='attributed-text']",
  ],
  // Strategy 5: Comment author
  commentAuthor: [
    "span.feed-shared-actor__name",
    "div.feed-shared-actor__description",
    "a[href*='/in/']",
    "span[class*='actor__name']",
  ],
  // Strategy 6: Show more replies — :has-text() selectors handled by text fallback
  showMoreReplies: [
    "button[aria-label*='replies']",
    "button[aria-label*='more']",
    "button[role='button']",
  ],
  // Strategy 7: Reply/comment input box
  commentInput: [
    'div[role="textbox"]',
    'textarea[placeholder*="comment"]',
    'div[class*="comment-box"] div[role="textbox"]',
    'div[contenteditable="true"]',
  ],
  // Strategy 8: Post button — :has-text() selectors handled by text fallback
  postButton: [
    'button[class*="post"]',
    'button[type="submit"]',
    'button[role="button"]',
  ],
  // Strategy 9: Text-based button matching (used by trySelectorsWithText)
  showMoreText: ["Show more", "Show all", "more replies"],
  postButtonText: ["Post", "Reply"],
} as const;

// ─── Post Data Structure ──────────────────────────────────────────
interface ScrapedPost {
  urn: string;
  url: string;
  text: string;
  timestamp: Date | null;
}

// ─── Helper Functions ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 500));
}

function generateCommentId(commentId: string, postUrn: string): string {
  return `li-comment-${commentId}-${postUrn}`;
}

function normalizeUrl(raw: string): string {
  if (raw.startsWith("http")) return raw;
  return `https://www.linkedin.com${raw}`;
}

/**
 * Extract a post URN from a LinkedIn URL.
 * URLs look like: https://www.linkedin.com/feed/update/urn:li:activity:7123456789/
 * or: https://www.linkedin.com/posts/username_activity-7123456789-AbCd/
 */
function extractPostUrnFromUrl(url: string): string | null {
  // Try /feed/update/urn:li:activity:xxx format
  const feedMatch = url.match(/\/feed\/update\/(urn:li:[^\/\?]+)/);
  if (feedMatch) return feedMatch[1];

  // Try /posts/..._activity-xxx-... format
  const activityMatch = url.match(/activity[-:](\d+)/);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;

  // Try /posts/..._share-xxx-... format
  const shareMatch = url.match(/share[-:](\d+)/);
  if (shareMatch) return `urn:li:share:${shareMatch[1]}`;

  return null;
}

/**
 * Extract the comment ID from the scraped data or generate one.
 */
function extractCommentId(element: Element): string {
  // Try data attributes first
  const dataId = element.getAttribute("data-comment-id") ||
    element.getAttribute("data-id") ||
    element.getAttribute("id");
  if (dataId) return dataId;

  // Fall back to generating from content hash
  const text = element.textContent?.trim().slice(0, 100) ?? "";
  return `gen-${Buffer.from(text).toString("base64url").slice(0, 16)}`;
}

// ─── Scraping Functions ───────────────────────────────────────────

/**
 * Try multiple CSS selectors to find elements on the page.
 * Returns the first selector that finds elements.
 */
async function trySelectors(page: any, selectors: readonly string[]): Promise<string | null> {
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
 * Find a button by text content on the page.
 * Returns 'TEXT_MATCH' if found, null otherwise.
 */
async function findButtonByText(page: any, searchText: string): Promise<boolean> {
  try {
    const found = await page.evaluate((search: string) => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      return buttons.some(b => b.textContent?.includes(search));
    }, searchText);
    return found;
  } catch {
    return false;
  }
}

/**
 * Try CSS selectors first, then fall back to text-based button matching.
 */
async function trySelectorsWithText(
  page: any,
  selectors: readonly string[],
  textOptions: readonly string[],
): Promise<string | null> {
  // Try CSS selectors first
  const cssResult = await trySelectors(page, selectors);
  if (cssResult) return cssResult;

  // Fall back to text matching
  for (const text of textOptions) {
    const found = await findButtonByText(page, text);
    if (found) return `TEXT_MATCH:${text}`;
  }

  return null;
}

/**
 * Scrape the user's recent posts from the LinkedIn activity feed.
 */
async function scrapeUserPosts(): Promise<ScrapedPost[]> {
  logger.info("linkedin.scraper.scraping_posts");

  const result = await withLinkedInPage(async (page) => {
    const posts: ScrapedPost[] = [];

    // Navigate to the user's activity/all posts page
    await page.goto("https://www.linkedin.com/feed/?segmentationFilter=memberActivity", {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Check for cookie-expired redirect
    const feedUrl = page.url();
    if (feedUrl.includes("/login") || feedUrl.includes("/uas/oauth")) {
      logger.error("linkedin.scraper.cookie_expired", { url: feedUrl });
      throw new Error("LinkedIn cookie expired — please re-run scripts/extract-linkedin-cookie.mjs");
    }

    await delay(FEED_STABILIZE_DELAY_MS); // Wait for page to stabilize

    // Auto-scroll to trigger lazy loading of more posts
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let scrollCount = 0;
        const maxScrolls = 3;
        const scrollInterval = setInterval(() => {
          window.scrollBy(0, 800);
          scrollCount++;
          if (scrollCount >= maxScrolls) {
            clearInterval(scrollInterval);
            resolve(undefined);
          }
        }, 1000);
      });
    });
    await delay(2000);

    // Try each post container selector strategy
    const workingSelector = await trySelectors(page, SELECTOR_STRATEGIES.postContainers);
    if (!workingSelector) {
      logger.warn("linkedin.scraper.no_posts_found", { tried: SELECTOR_STRATEGIES.postContainers });
      return posts;
    }

    logger.info("linkedin.scraper.post_selector_found", { selector: workingSelector });

    // Wait for post containers to appear
    try {
      await page.waitForSelector(workingSelector, { timeout: COMMENT_SECTION_TIMEOUT_MS });
    } catch {
      logger.warn("linkedin.scraper.post_wait_timeout", { selector: workingSelector });
      return posts;
    }

    // Extract post data
    const postData = await page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector)).slice(0, 10);
      return elements.map((el) => {
        // Find the post link
        const link = el.querySelector("a[href*='feed/update'], a[href*='activity'], a[href*='/posts/']");
        const url = link ? (link as HTMLAnchorElement).href : null;

        // Find the post text
        const textEl = el.querySelector("div.feed-shared-text, span.break-words, div.attributed-text-segment-list__content, span[class*='main-content']");
        const text = textEl ? (textEl as HTMLElement).innerText?.trim() : "";

        // Find timestamp
        const timeEl = el.querySelector("time");
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
        url: normalizeUrl(pd.url),
        text: pd.text,
        timestamp: pd.datetime ? new Date(pd.datetime) : null,
      });
    }

    logger.info("linkedin.scraper.posts_found", { count: posts.length });
    return posts;
  });

  return result ?? [];
}

/**
 * Scrape comments from a single LinkedIn post.
 */
async function scrapePostComments(post: ScrapedPost): Promise<RawComment[]> {
  return withRetry("scrapePostComments", async () => {
    const result = await withLinkedInPage(async (page) => {
      const postComments: RawComment[] = [];

      await page.goto(post.url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });

      await delay(2000);

      // Try each comment selector strategy
      const workingCommentSelector = await trySelectors(page, SELECTOR_STRATEGIES.commentItems);
      if (!workingCommentSelector) {
        logger.warn("linkedin.scraper.no_comments_found", {
          postUrn: post.urn,
          tried: SELECTOR_STRATEGIES.commentItems,
        });
        return postComments;
      }

      logger.info("linkedin.scraper.comment_selector_found", { selector: workingCommentSelector });

      // Try to wait for comments section
      try {
        await page.waitForSelector(workingCommentSelector, { timeout: COMMENT_SECTION_TIMEOUT_MS });
      } catch {
        logger.warn("linkedin.scraper.comment_wait_timeout", { postUrn: post.urn });
        return postComments;
      }

      // Click "Show more replies" if present to load all comments
      const showMoreSelector = await trySelectorsWithText(
        page,
        SELECTOR_STRATEGIES.showMoreReplies,
        SELECTOR_STRATEGIES.showMoreText,
      );
      if (showMoreSelector) {
        try {
          if (showMoreSelector.startsWith("TEXT_MATCH:")) {
            // Use Playwright's locator for text-based buttons
            const buttonText = showMoreSelector.split("TEXT_MATCH:")[1];
            const showMoreBtn = await page.getByRole("button", { name: buttonText, exact: false }).first();
            if (showMoreBtn) {
              await showMoreBtn.click();
              await delay(1000);
            }
          } else {
            const showMoreBtn = await page.$(showMoreSelector);
            if (showMoreBtn) {
              await showMoreBtn.click();
              await delay(1000);
            }
          }
        } catch {
          // No show more button clickable, continue anyway
        }
      }

      // Extract comments
      const commentData = await page.evaluate(
        ({ commentSelector, maxCount }: { commentSelector: string; maxCount: number }) => {
          const elements = Array.from(document.querySelectorAll(commentSelector)).slice(0, maxCount);
          return elements.map((el) => {
            // Author
            const authorLink = el.querySelector("a[href*='/in/']");
            const authorName = authorLink
              ? (authorLink as HTMLElement).innerText?.trim()
              : (el.querySelector("span.feed-shared-actor__name, div.feed-shared-actor__description, span[class*='actor__name']") as HTMLElement)?.innerText?.trim()
              || "Unknown";

            // Comment text - try multiple selectors
            const textEl = el.querySelector("span.comments-comment-item__main-content, span[class*='main-content'], span[class*='break-words'], div[class*='attributed-text']");
            const content = textEl
              ? (textEl as HTMLElement).innerText?.trim()
              : "";

            // Timestamp
            const timeEl = el.querySelector("time");
            const datetime = timeEl ? (timeEl as HTMLTimeElement).dateTime : null;

            // Comment ID
            const commentId = el.getAttribute("data-comment-id") ||
              el.getAttribute("data-id") ||
              el.getAttribute("data-urn") ||
              el.id ||
              "";

            return { authorName, content, datetime, commentId };
          });
        },
        { commentSelector: workingCommentSelector, maxCount: MAX_COMMENTS_PER_POST }
      );

      for (const cd of commentData as Array<{ authorName: string; content: string; datetime: string | null; commentId: string }>) {
        if (!cd.content) continue;

        postComments.push({
          platformItemId: generateCommentId(cd.commentId || cd.content.slice(0, 50), post.urn),
          authorName: cd.authorName,
          content: cd.content,
          parentContent: post.text,
          platformUrl: post.url,
          createdAt: cd.datetime ? new Date(cd.datetime) : new Date(),
        });
      }

      return postComments;
    });

    return result ?? [];
  }).then((r) => r ?? []);
}

/**
 * Main function: scrape all recent posts and their comments.
 */
export async function scrapeLinkedInComments(since?: Date): Promise<RawComment[]> {
  logger.info("linkedin.scraper.operation_start", { operation: "scrapeLinkedInComments", since: since?.toISOString() });

  try {
    // Phase 1: Get user's recent posts
    const postsResult = await withRetry("scrapeUserPosts", scrapeUserPosts);
    const posts = postsResult ?? [];

    if (posts.length === 0) {
      logger.info("linkedin.scraper.no_posts_to_scrape");
      return [];
    }

    // Phase 2: Scrape comments from each post
    const allComments: RawComment[] = [];

    for (const post of posts) {
      // Skip posts older than the since date
      if (since && post.timestamp && post.timestamp < since) {
        continue;
      }

      logger.info("linkedin.scraper.scraping_post_comments", {
        postUrn: post.urn,
        postUrl: post.url,
      });

      const postComments = await scrapePostComments(post);
      allComments.push(...postComments);

      logger.info("linkedin.scraper.post_comments_done", {
        postUrn: post.urn,
        count: postComments.length,
      });

      // Rate limiting delay between posts
      await delay(DELAY_BETWEEN_PAGES_MS);
    }

    logger.info("linkedin.scraper.operation_complete", {
      operation: "scrapeLinkedInComments",
      postsScraped: posts.length,
      totalComments: allComments.length,
    });

    return allComments;
  } catch (err) {
    logger.error("linkedin.scraper.failed", { error: String(err) });
    return [];
  }
}

/**
 * Post a reply to a LinkedIn comment via browser automation.
 */
export async function postReplyToLinkedInComment(
  platformItemId: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  logger.info("linkedin.scraper.reply_start", { platformItemId });

  try {
    // Extract the post URN from the platformItemId
    // Format: li-comment-{commentId}-{postUrn}
    const postUrnMatch = platformItemId.match(/li-comment-.+?-(urn:li:[^:]+:\d+)/);
    if (!postUrnMatch) {
      return { success: false, error: "Could not extract post URN from platformItemId" };
    }

    // Reconstruct post URL
    const postUrl = `https://www.linkedin.com/feed/update/${postUrnMatch[1]}`;

    const result = await withLinkedInPage(async (page) => {
      // Navigate to the post
      await page.goto(postUrl, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });

      await delay(2000);

      // Find comment input using multiple strategies
      const commentInputSelector = await trySelectors(page, SELECTOR_STRATEGIES.commentInput as readonly string[]);
      if (!commentInputSelector) {
        logger.warn("linkedin.scraper.reply_comment_box_not_found");
        return { success: false, error: "Could not find comment input" };
      }

      const commentBox = await page.$(commentInputSelector);
      if (!commentBox) {
        return { success: false, error: "Could not find comment input element" };
      }

      // Click to focus the comment box
      await commentBox.click();
      await delay(500);

      // Type the reply text
      await commentBox.fill(text);
      await delay(500);

      // Find and click the Post/Reply button
      const postButtonSelector = await trySelectorsWithText(
        page,
        SELECTOR_STRATEGIES.postButton,
        SELECTOR_STRATEGIES.postButtonText,
      );
      if (!postButtonSelector) {
        logger.warn("linkedin.scraper.reply_post_button_not_found");
        return { success: false, error: "Could not find post button" };
      }

      let postButton;
      if (postButtonSelector.startsWith("TEXT_MATCH:")) {
        const buttonText = postButtonSelector.split("TEXT_MATCH:")[1];
        postButton = await page.getByRole("button", { name: buttonText, exact: false }).first();
      } else {
        postButton = await page.$(postButtonSelector);
      }
      if (!postButton) {
        return { success: false, error: "Could not find post button element" };
      }

      // Check if button is disabled
      const isDisabled = await postButton.isDisabled();
      if (isDisabled) {
        logger.warn("linkedin.scraper.reply_button_disabled");
        return { success: false, error: "Post button is disabled" };
      }

      await postButton.click();

      // Wait for the reply to be posted (check for text presence)
      await delay(2000);

      // Verify the reply appeared using page.evaluate
      const replyAppeared = await page.evaluate((searchText) => {
        return document.body.innerText.includes(searchText);
      }, text.slice(0, 50));
      if (!replyAppeared) {
        logger.warn("linkedin.scraper.reply_not_visible_after_post");
      }

      return { success: true };
    });

    if (!result) {
      return { success: false, error: "Browser session not available (no cookie)" };
    }

    logger.info("linkedin.scraper.reply_complete", { platformItemId });
    return result;
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      logger.warn("linkedin.scraper.reply_cookie_expired", { platformItemId });
      return { success: false, error: "LinkedIn session expired — refresh cookie and try again" };
    }
    logger.error("linkedin.scraper.reply_failed", { platformItemId, error: String(err) });
    return { success: false, error: String(err) };
  }
}

/**
 * Post a reply to a LinkedIn DM (not supported via scraping).
 */
export async function postReplyToLinkedInDM(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "LinkedIn DMs not available via scraping" };
}
