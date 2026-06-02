import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const SESSION_COOKIE_ENV = "BLUESKY_SESSION_COOKIE";

let cachedCookie: string | null = null;

function resolveCookie(): string | null {
  if (cachedCookie) return cachedCookie;
  const cookie = loadCookie("bluesky-session", SESSION_COOKIE_ENV);
  if (cookie) cachedCookie = cookie;
  return cookie;
}

export interface BlueskyPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  likes: number;
  replies: number;
  reposts: number;
  timestamp: Date;
}

export interface BlueskyComment {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

export interface BlueskyMention {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export async function scrapeBlueskyPosts(handle?: string): Promise<BlueskyPost[]> {
  const cookie = resolveCookie();
  if (!cookie) {
    logger.warn("bluesky.scraper.no_cookie");
    return [];
  }

  try {
    const profileUrl = handle ? `https://bsky.app/profile/${handle}` : "https://bsky.app/";

    const posts = await withPage(async (page: PlaywrightPage) => {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval('[data-testid*="post"], article, div[role="article"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('[data-testid*="postText"], div[dir="ltr"], p');
          const authorEl = el.querySelector('[data-testid*="displayName"], strong');
          const handleEl = el.querySelector('[data-testid*="handle"], span[class*="handle"]');
          const likeEl = el.querySelector('[aria-label*="like"], [data-testid*="like"]');
          const replyEl = el.querySelector('[aria-label*="reply"], [data-testid*="reply"]');
          const repostEl = el.querySelector('[aria-label*="repost"], [data-testid*="repost"]');
          const timeEl = el.querySelector('time');

          return {
            id: el.getAttribute("data-post-id") || el.getAttribute("data-testid") || "",
            text: textEl?.textContent?.trim() || "",
            author: authorEl?.textContent?.trim() || "",
            authorHandle: handleEl?.textContent?.trim() || "",
            likes: parseEngagementNumber(likeEl?.getAttribute("aria-label") || ""),
            replies: parseEngagementNumber(replyEl?.getAttribute("aria-label") || ""),
            reposts: parseEngagementNumber(repostEl?.getAttribute("aria-label") || ""),
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return scraped.filter((p) => p.text || p.author);
    }, {
      cookies: [{
        name: "session",
        value: cookie,
        domain: ".bsky.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("bluesky.scraper.complete", { postCount: posts.length, handle });
    return posts;
  } catch (err) {
    logger.error("bluesky.scraper.failed", { error: String(err), handle });
    return [];
  }
}

export async function scrapeBlueskyComments(postUrl: string): Promise<BlueskyComment[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('[data-testid*="comment"], [data-testid*="post"], article', (elements: Element[]) => {
        return elements.slice(1, 51).map((el) => {
          const textEl = el.querySelector('[data-testid*="postText"], div[dir="ltr"], p');
          const authorEl = el.querySelector('[data-testid*="displayName"], strong');
          const handleEl = el.querySelector('[data-testid*="handle"], span[class*="handle"]');
          const timeEl = el.querySelector('time');

          return {
            id: el.getAttribute("data-comment-id") || el.getAttribute("data-post-id") || "",
            authorName: authorEl?.textContent?.trim() || "",
            authorHandle: handleEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [{
        name: "session",
        value: cookie,
        domain: ".bsky.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("bluesky.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeBlueskyMentions(): Promise<BlueskyMention[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://bsky.app/notifications", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const mentions = await page.$$eval('[data-testid*="notification"], article, div[role="article"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('p, span, div[class*="text"]');
          const authorEl = el.querySelector('strong, [data-testid*="displayName"]');

          return {
            id: el.getAttribute("data-notification-id") || "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: new Date(),
          };
        });
      });

      return mentions.filter((m) => m.content);
    }, {
      cookies: [{
        name: "session",
        value: cookie,
        domain: ".bsky.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("bluesky.scraper.mentions_failed", { error: String(err) });
    return [];
  }
}

async function autoScrollForLazyLoad(page: PlaywrightPage, maxScrolls = 10): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(800);
  }
}

function parseEngagementNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().toLowerCase();
  const kMatch = cleaned.match(/([\d.]+)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);
  const mMatch = cleaned.match(/([\d.]+)\s*m/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);
  const numMatch = cleaned.replace(/,/g, "").match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 0;
}
