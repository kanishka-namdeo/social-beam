import { withPage } from "./cloak";
import type { RedditPost } from "./types";
import { logger } from "@/lib/logger";
import type { ProcessContext } from "@/lib/processes/process-context";
import { XMLParser } from "fast-xml-parser";

const VALID_SORT_ORDERS = ["hot", "rising", "new"] as const;
type SortOrder = (typeof VALID_SORT_ORDERS)[number];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function normalizeSortOrder(sortOrder: string): SortOrder {
  if (VALID_SORT_ORDERS.includes(sortOrder as SortOrder)) {
    return sortOrder as SortOrder;
  }
  return "hot";
}

async function scrapeViaRssFeed(subreddit: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/.rss`;
  logger.debug("reddit.scrape.rss_feed", { url });

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      Accept: "application/atom+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`RSS feed returned ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const feed = parser.parse(xml);

  const entries = feed?.feed?.entry;
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const posts: Omit<RedditPost, "createdAt">[] = [];

  for (const entry of entries.slice(0, 25)) {
    const title = entry?.title?.trim();
    const link = entry?.link?.["@_href"];
    const author = entry?.author?.name?.replace(/^\/u\//, "") ?? "[deleted]";

    if (!title || !link) continue;

    // Extract permalink from full URL
    const permalinkMatch = link.match(/reddit\.com(\/r\/[^/]+\/comments\/[^/]+)/);
    const permalink = permalinkMatch ? permalinkMatch[1] : null;
    if (!permalink) continue;

    posts.push({
      title,
      url: `https://reddit.com${permalink}`,
      author,
      upvotes: 0, // RSS doesn't include vote count
      commentCount: 0, // RSS doesn't include comment count
      subreddit,
    });
  }

  return posts.map((p) => ({ ...p, createdAt: new Date() }));
}

async function scrapeViaJsonApi(subreddit: string, order: SortOrder): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/${order}.json?limit=25&raw_json=1`;
  logger.debug("reddit.scrape.json_api", { url });

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`JSON API returned ${res.status}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const data = json as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
  const children = data?.data?.children ?? [];

  const posts: Omit<RedditPost, "createdAt">[] = [];

  for (const child of children) {
    const d = child.data;
    if (!d) continue;

    const title = (d.title as string)?.trim();
    const permalink = d.permalink as string;
    if (!title || !permalink) continue;

    posts.push({
      title,
      url: `https://reddit.com${permalink}`,
      author: (d.author as string) ?? "[deleted]",
      upvotes: (d.ups as number) ?? 0,
      commentCount: (d.num_comments as number) ?? 0,
      subreddit,
    });
  }

  return posts.map((p) => ({ ...p, createdAt: new Date() }));
}

async function scrapeViaBrowser(subreddit: string, order: SortOrder): Promise<RedditPost[]> {
  const posts = await withPage(async (page) => {
    const url = `https://www.reddit.com/r/${subreddit}/${order}/`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      await page.waitForSelector("shreddit-post", { timeout: 15000 });
    } catch {
      logger.warn("reddit.scrape.browser_no_posts", { subreddit, sortOrder: order });
      return [];
    }

    const scraped = await page.$$eval("shreddit-post", (elements: Element[]) => {
      return elements.slice(0, 25).map((el: Element) => ({
        title: el.getAttribute("post-title") ?? el.querySelector("h3")?.textContent?.trim() ?? "",
        url: el.getAttribute("permalink")
          ? `https://reddit.com${el.getAttribute("permalink")}`
          : "",
        author: el.getAttribute("author") ?? "",
        upvotes: parseInt(el.getAttribute("score") ?? "0", 10),
        commentCount: parseInt(el.getAttribute("comment-count") ?? "0", 10),
      }));
    });

    return scraped.filter((p: { title: string; url: string }) => p.title && p.url);
  });

  return posts.map((p: Omit<RedditPost, "subreddit" | "createdAt">) => ({
    ...p,
    subreddit,
    createdAt: new Date(),
  }));
}

export async function scrapeSubreddit(
  subreddit: string,
  sortOrder?: string,
  retryCount = 0,
  ctx?: ProcessContext,
): Promise<RedditPost[]> {
  const order = normalizeSortOrder(sortOrder ?? "hot");
  ctx?.log('info', 'Reddit scrape started', { subreddit, sortOrder: order });
  logger.debug("reddit.scrape.start", { subreddit, sortOrder: order, attempt: retryCount + 1 });

  // Strategy 1: Try RSS feed (most reliable, least likely to be blocked)
  try {
    const posts = await scrapeViaRssFeed(subreddit);
    if (posts.length > 0) {
      ctx?.log('info', 'Reddit scrape complete', { subreddit, postCount: posts.length });
      logger.info("reddit.scrape.complete", {
        subreddit,
        sortOrder: order,
        postCount: posts.length,
        method: "rss_feed",
      });
      return posts;
    }
  } catch (err) {
    logger.warn("reddit.scrape.rss_feed_failed", { subreddit, error: String(err) });
  }

  // Strategy 2: Try JSON API (fast, but often blocked)
  try {
    const posts = await scrapeViaJsonApi(subreddit, order);
    if (posts.length > 0) {
      ctx?.log('info', 'Reddit scrape complete', { subreddit, postCount: posts.length });
      logger.info("reddit.scrape.complete", {
        subreddit,
        sortOrder: order,
        postCount: posts.length,
        method: "json_api",
      });
      return posts;
    }
  } catch (err) {
    logger.warn("reddit.scrape.json_api_failed", { subreddit, error: String(err) });
  }

  // Strategy 3: Fall back to browser scraping (slowest, most resource-intensive)
  try {
    const posts = await scrapeViaBrowser(subreddit, order);
    if (posts.length > 0) {
      ctx?.log('info', 'Reddit scrape complete', { subreddit, postCount: posts.length });
      logger.info("reddit.scrape.complete", {
        subreddit,
        sortOrder: order,
        postCount: posts.length,
        method: "browser",
      });
      return posts;
    }
  } catch (err) {
    logger.warn("reddit.scrape.browser_failed", { subreddit, error: String(err) });
  }

  // Strategy 4: Retry once with delay if we've exhausted strategies
  if (retryCount === 0) {
    logger.info("reddit.scrape.retry", { subreddit, delayMs: 5000 });
    await new Promise((r) => setTimeout(r, 5000));
    return scrapeSubreddit(subreddit, order, 1, ctx);
  }

  // All strategies exhausted
  logger.error("reddit.scrape.all_failed", { subreddit });
  return [];
}
