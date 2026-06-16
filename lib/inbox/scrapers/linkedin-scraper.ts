import { logger } from "@/lib/logger";
import type { RawComment } from "@/lib/inbox/types";
import { withLinkedInPageForUser, shutdownBrowser, scrapeEnhancedPostAnalyticsForUser, type EnhancedLinkedInPostAnalytics } from "@/lib/linkedin/browser";
import { INBOX_SELECTORS, POST_CONTAINER_SELECTORS } from "@/lib/linkedin/selectors";
import {
  extractPostUrnFromUrl,
  normalizeUrl,
  delay,
  withRetry,
  isLinkedInLoginPage,
  triggerSelfHealerForScraper,
  LinkedInCookieExpiredError,
} from "@/lib/linkedin/scraping-utils";
import { scrapePosts, type ScrapedPost } from "@/lib/linkedin/post-scraper";
import type { ProcessContext } from "@/lib/processes/process-context";

// ─── Configuration ────────────────────────────────────────────────
const MAX_COMMENTS_PER_POST = 50;
const DELAY_BETWEEN_PAGES_MS = 2500;
const PAGE_LOAD_TIMEOUT_MS = 30000;
const COMMENT_SECTION_TIMEOUT_MS = 15000;

// For 3 months of data, we need more aggressive scrolling
const SCROLL_ITERATIONS_FOR_3_MONTHS = 30; // Increased from 3
const MAX_POSTS_FOR_3_MONTHS = 100; // Increased from 10

// ─── Helper Functions ─────────────────────────────────────────────

function extractHandle(profileUrl: string): string | null {
  const match = profileUrl.match(/\/in\/([^/]+)/);
  return match?.[1] ?? null;
}

function generateCommentId(commentId: string, postUrn: string): string {
  return `li-comment-${commentId}-${postUrn}`;
}

/**
 * Extract the comment ID from the scraped data or generate one.
 */
function extractCommentId(element: Element): string {
  // Try data attributes first
  const dataId =
    element.getAttribute("data-comment-id") ||
    element.getAttribute("data-id") ||
    element.getAttribute("id");
  if (dataId) return dataId;

  // Fall back to generating from content hash
  const text = element.textContent?.trim().slice(0, 100) ?? "";
  return `gen-${Buffer.from(text).toString("base64url").slice(0, 16)}`;
}

/**
 * Try multiple CSS selectors to find elements on the page.
 * Returns the first selector that finds elements.
 */
async function trySelectors(
  page: any,
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
 * Find a button by text content on the page.
 * Returns true if found, false otherwise.
 */
async function findButtonByText(
  page: any,
  searchText: string,
): Promise<boolean> {
  try {
    const found = await page.evaluate((search: string) => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button"),
      );
      return buttons.some((b) => b.textContent?.includes(search));
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

// ─── Scraping Functions ───────────────────────────────────────────

/**
 * Scrape comments from a single LinkedIn post.
 */
async function scrapePostComments(
  post: ScrapedPost,
  workspaceId: string,
): Promise<RawComment[]> {
  return withRetry("scrapePostComments", async () => {
    const result = await withLinkedInPageForUser(workspaceId, async (page) => {
      const postComments: RawComment[] = [];

      await page.goto(post.url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });

      await delay(2000);

      // Try each comment selector strategy
      const workingCommentSelector = await trySelectors(
        page,
        INBOX_SELECTORS.commentItems,
      );
      if (!workingCommentSelector) {
        logger.warn("linkedin.scraper.no_comments_found", {
          postUrn: post.urn,
          tried: INBOX_SELECTORS.commentItems,
        });
        return postComments;
      }

      logger.info("linkedin.scraper.comment_selector_found", {
        selector: workingCommentSelector,
      });

      // Try to wait for comments section
      try {
        await page.waitForSelector(workingCommentSelector, {
          timeout: COMMENT_SECTION_TIMEOUT_MS,
        });
      } catch {
        logger.warn("linkedin.scraper.comment_wait_timeout", {
          postUrn: post.urn,
        });
        return postComments;
      }

      // Click "Show more replies" if present to load all comments
      const showMoreSelector = await trySelectorsWithText(
        page,
        INBOX_SELECTORS.showMoreReplies,
        INBOX_SELECTORS.showMoreText,
      );
      if (showMoreSelector) {
        try {
          if (showMoreSelector.startsWith("TEXT_MATCH:")) {
            // Use Playwright's locator for text-based buttons
            const buttonText = showMoreSelector.split("TEXT_MATCH:")[1];
            const showMoreBtn = await page
              .getByRole("button", { name: buttonText, exact: false })
              .first();
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
        (
          { commentSelector, maxCount }: { commentSelector: string; maxCount: number },
        ) => {
          const elements = Array.from(
            document.querySelectorAll(commentSelector),
          ).slice(0, maxCount);
          return elements.map((el) => {
            // Author - find the first profile link with an image (avatar link)
            const authorLinks = Array.from(el.querySelectorAll("a[href*='/in/']"));
            const avatarLink = authorLinks.find(a => a.querySelector("img[src*='media.licdn.com']")) || authorLinks[0];
            
            // Extract author name from the link text or from nearby elements
            let authorName = "Unknown";
            if (avatarLink) {
              // Try to get name from the link's text content
              const linkText = (avatarLink as HTMLElement).innerText?.trim();
              if (linkText && linkText.length > 0 && linkText.length < 100) {
                authorName = linkText;
              } else {
                // Fallback: get name from the next link that has text
                const nameLink = authorLinks.find(a => {
                  const t = (a as HTMLElement).innerText?.trim();
                  return t && t.length > 1 && t.length < 80 && !t.includes("http");
                });
                if (nameLink) {
                  authorName = (nameLink as HTMLElement).innerText?.trim() || "Unknown";
                }
              }
            }

            // Profile URL and handle from the author link
            const profileUrl = avatarLink?.getAttribute("href") || null;
            const handleMatch = profileUrl?.match(/\/in\/([^/]+)/);
            const handle = handleMatch ? handleMatch[1] : null;

            // Author avatar - extract from <figure><img> inside the avatar link
            let authorAvatar: string | null = null;
            if (avatarLink) {
              const avatarImg = avatarLink.querySelector("img[src*='media.licdn.com']") ||
                                el.querySelector("figure img[src*='media.licdn.com']");
              authorAvatar = avatarImg?.getAttribute("src") || null;
            }

            // Comment text - try multiple strategies
            let content = "";
            
            // Strategy 1: Look for <p> elements with substantial text (new LinkedIn structure)
            const pElements = Array.from(el.querySelectorAll("p"));
            for (const p of pElements) {
              const pText = (p as HTMLElement).innerText?.trim() || "";
              // Skip short text like author names, timestamps
              if (pText.length > 20 && !/^\d+\s*(min|hour|day|week|month|yr|sec|من)/i.test(pText)) {
                content = pText;
                break;
              }
            }
            
            // Strategy 2: Legacy selectors
            if (!content) {
              const textEl = el.querySelector(
                "span.comments-comment-item__main-content, span[class*='main-content'], span[class*='break-words'], div[class*='attributed-text']",
              );
              content = textEl
                ? (textEl as HTMLElement).innerText?.trim()
                : "";
            }

            // Timestamp - try multiple strategies
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

            // Comment ID - extract from componentkey attribute (new structure) or data attributes
            const componentKey = el.getAttribute("componentkey") || "";
            const urnMatch = componentKey.match(/urn:li:comment:\(([^)]+)\)/);
            const commentId =
              (urnMatch ? urnMatch[1] : null) ||
              el.getAttribute("data-comment-id") ||
              el.getAttribute("data-id") ||
              el.getAttribute("data-urn") ||
              el.id ||
              "";

            return { authorName, content, datetime, commentId, profileUrl, handle, authorAvatar };
          });
        },
        { commentSelector: workingCommentSelector, maxCount: MAX_COMMENTS_PER_POST },
      );

      for (const cd of commentData as Array<{
        authorName: string;
        content: string;
        datetime: string | null;
        commentId: string;
        profileUrl: string | null;
        handle: string | null;
        authorAvatar: string | null;
      }>) {
        if (!cd.content) continue;

        postComments.push({
          platformItemId: generateCommentId(
            cd.commentId || cd.content.slice(0, 50),
            post.urn,
          ),
          authorName: cd.authorName,
          authorAvatar: cd.authorAvatar || undefined,
          authorProfileUrl: cd.profileUrl,
          authorHandle: cd.handle,
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
 * Scraped post with comments and analytics data
 */
export interface ScrapedPostWithData {
  post: ScrapedPost;
  comments: RawComment[];
  analytics: EnhancedLinkedInPostAnalytics | null;
}

/**
 * Main function: scrape all recent posts and their comments.
 */
export async function scrapeLinkedInComments(
  workspaceId: string,
  since?: Date,
): Promise<RawComment[]> {
  logger.info("linkedin.scraper.operation_start", {
    operation: "scrapeLinkedInComments",
    since: since?.toISOString(),
  });

  try {
    // Phase 1: Get user's recent posts using shared scrapePosts
    const postsResult = await withRetry("scrapePosts", () =>
      scrapePosts(workspaceId, {
        pageUrl: "https://www.linkedin.com/in/me/recent-activity/all/",
        scrollIterations: 3,
        maxPosts: 10,
      }),
    );
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

      const postComments = await scrapePostComments(post, workspaceId);
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
 * Comprehensive scraper: fetches posts, comments, and analytics for the last 3 months.
 * This is the main function for getting complete LinkedIn engagement data.
 */
export async function scrapeLinkedInComplete(
  workspaceId: string,
  since?: Date,
  ctx?: ProcessContext,
): Promise<ScrapedPostWithData[]> {
  await ctx?.reportProgress(0, 'Starting LinkedIn scrape...');
  
  // Default to 3 months ago if no date provided
  const defaultSince = since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  logger.info("linkedin.complete_scraper.start", {
    workspaceId,
    since: defaultSince.toISOString(),
    monthsBack: 3,
  });

  try {
    // Phase 1: Get user's posts with more aggressive scrolling for 3 months of data
    logger.info("linkedin.complete_scraper.fetching_posts", {
      scrollIterations: SCROLL_ITERATIONS_FOR_3_MONTHS,
      maxPosts: MAX_POSTS_FOR_3_MONTHS,
    });

    const postsResult = await withRetry("scrapePosts", () =>
      scrapePosts(workspaceId, {
        pageUrl: "https://www.linkedin.com/feed/?segmentationFilter=memberActivity",
        scrollIterations: SCROLL_ITERATIONS_FOR_3_MONTHS,
        maxPosts: MAX_POSTS_FOR_3_MONTHS,
      }, ctx),
    );
    const allPosts = postsResult ?? [];

    if (allPosts.length === 0) {
      logger.info("linkedin.complete_scraper.no_posts_found");
      return [];
    }

    // Filter posts by date
    const posts = allPosts.filter(post => {
      if (!post.timestamp) return true; // Include posts without timestamps
      return post.timestamp >= defaultSince;
    });

    logger.info("linkedin.complete_scraper.posts_filtered", {
      totalPosts: allPosts.length,
      postsInDateRange: posts.length,
      since: defaultSince.toISOString(),
    });

    if (posts.length === 0) {
      logger.info("linkedin.complete_scraper.no_posts_in_date_range");
      return [];
    }

    await ctx?.reportProgress(20, `Found ${posts.length} posts, processing...`);

    // Phase 2: Scrape comments and analytics for each post
    const results: ScrapedPostWithData[] = [];

    for (let i = 0; i < posts.length; i++) {
      ctx?.throwIfCancelled();
      const post = posts[i];
      
      logger.info("linkedin.complete_scraper.processing_post", {
        postIndex: i + 1,
        totalPosts: posts.length,
        postUrn: post.urn,
      });

      await ctx?.reportProgress(20 + Math.round((i / posts.length) * 70), `Processing post ${i + 1} of ${posts.length}`);

      // Scrape comments
      const comments = await scrapePostComments(post, workspaceId);
      
      logger.info("linkedin.complete_scraper.comments_scraped", {
        postUrn: post.urn,
        commentCount: comments.length,
      });

      // Scrape analytics
      const analytics = await scrapeEnhancedPostAnalyticsForUser(workspaceId, post.url);
      
      logger.info("linkedin.complete_scraper.analytics_scraped", {
        postUrn: post.urn,
        impressions: analytics?.impressions || 0,
        likes: analytics?.likes || 0,
        comments: analytics?.comments || 0,
        shares: analytics?.shares || 0,
      });

      results.push({
        post,
        comments,
        analytics,
      });

      await ctx?.reportPostsProcessed(i + 1);

      // Rate limiting delay between posts
      if (i < posts.length - 1) {
        await delay(DELAY_BETWEEN_PAGES_MS);
      }
    }

    // Summary statistics
    const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);
    const totalImpressions = results.reduce((sum, r) => sum + (r.analytics?.impressions || 0), 0);
    const totalLikes = results.reduce((sum, r) => sum + (r.analytics?.likes || 0), 0);
    const totalShares = results.reduce((sum, r) => sum + (r.analytics?.shares || 0), 0);

    logger.info("linkedin.complete_scraper.complete", {
      workspaceId,
      postsScraped: results.length,
      totalComments,
      totalImpressions,
      totalLikes,
      totalShares,
      dateRange: {
        since: defaultSince.toISOString(),
        until: new Date().toISOString(),
      },
    });

    await ctx?.reportProgress(100, 'Complete');

    return results;
  } catch (err) {
    logger.error("linkedin.complete_scraper.failed", { error: String(err) });
    return [];
  }
}

/**
 * Post a reply to a LinkedIn comment via browser automation.
 */
export async function postReplyToLinkedInComment(
  workspaceId: string,
  platformItemId: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  logger.info("linkedin.scraper.reply_start", { platformItemId });

  try {
    // Extract the post URN from the platformItemId
    // Format: li-comment-{commentId}-{postUrn}
    const postUrnMatch = platformItemId.match(
      /li-comment-.+?-(urn:li:[^:]+:\d+)/,
    );
    if (!postUrnMatch) {
      return { success: false, error: "Could not extract post URN from platformItemId" };
    }

    // Reconstruct post URL
    const postUrl = `https://www.linkedin.com/feed/update/${postUrnMatch[1]}`;

    const result = await withLinkedInPageForUser(workspaceId, async (page) => {
      // Navigate to the post
      await page.goto(postUrl, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });

      await delay(2000);

      // Find comment input using multiple strategies
      const commentInputSelector = await trySelectors(
        page,
        INBOX_SELECTORS.commentInput as readonly string[],
      );
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
        INBOX_SELECTORS.postButton,
        INBOX_SELECTORS.postButtonText,
      );
      if (!postButtonSelector) {
        logger.warn("linkedin.scraper.reply_post_button_not_found");
        return { success: false, error: "Could not find post button" };
      }

      let postButton;
      if (postButtonSelector.startsWith("TEXT_MATCH:")) {
        const buttonText = postButtonSelector.split("TEXT_MATCH:")[1];
        postButton = await page
          .getByRole("button", { name: buttonText, exact: false })
          .first();
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
      logger.warn("linkedin.scraper.reply_cookie_expired", {
        platformItemId,
      });
      return {
        success: false,
        error: "LinkedIn session expired — refresh cookie and try again",
      };
    }
    logger.error("linkedin.scraper.reply_failed", {
      platformItemId,
      error: String(err),
    });
    return { success: false, error: String(err) };
  }
}

/**
 * Post a reply to a LinkedIn DM (not supported via scraping).
 */
export async function postReplyToLinkedInDM(): Promise<{
  success: boolean;
  error?: string;
}> {
  return { success: false, error: "LinkedIn DMs not available via scraping" };
}
