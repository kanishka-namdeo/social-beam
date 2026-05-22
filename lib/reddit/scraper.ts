import { withPage } from "./cloak";
import type { RedditPost } from "./types";
import { logger } from "@/lib/logger";

const VALID_SORT_ORDERS = ["hot", "rising", "new"] as const;
type SortOrder = (typeof VALID_SORT_ORDERS)[number];

function normalizeSortOrder(sortOrder: string): SortOrder {
  if (VALID_SORT_ORDERS.includes(sortOrder as SortOrder)) {
    return sortOrder as SortOrder;
  }
  return "hot";
}

export async function scrapeSubreddit(subreddit: string, sortOrder?: string): Promise<RedditPost[]> {
  const order = normalizeSortOrder(sortOrder ?? "hot");
  logger.debug("reddit.scrape.start", { subreddit, sortOrder: order });

  const posts = await withPage(async (page) => {
    const url = `https://www.reddit.com/r/${subreddit}/${order}/`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      await page.waitForSelector("shreddit-post", { timeout: 15000 });
    } catch {
      logger.warn("reddit.scrape.no_posts", { subreddit, sortOrder: order });
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

  logger.info("reddit.scrape.complete", { subreddit, sortOrder: order, postCount: posts.length });

  return posts.map((p: Omit<RedditPost, "subreddit" | "createdAt">) => ({
    ...p,
    subreddit,
    createdAt: new Date(),
  }));
}
