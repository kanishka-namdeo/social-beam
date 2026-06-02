import { withPage, loadCookie, saveCookie, delay, ScrapingBlockedError, RateLimitedError } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "./types";

const SESSIONID_COOKIE_ENV = "INSTAGRAM_SESSIONID_COOKIE";

let cachedCookie: string | null = null;

function resolveCookie(): string | null {
  if (cachedCookie) return cachedCookie;
  const cookie = loadCookie("instagram-sessionid", SESSIONID_COOKIE_ENV);
  if (cookie) cachedCookie = cookie;
  return cookie;
}

export interface InstagramPost {
  id: string;
  caption: string;
  imageUrl: string;
  likes: number;
  comments: number;
  timestamp: Date;
}

export interface InstagramComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

const POST_SELECTORS = [
  "article",
  "div[role='main'] article",
  "div[class*='MainArticle']",
];

const COMMENT_SELECTORS = [
  "ul[class*='ChildComment']",
  "div[class*='Comments']",
  "ul[role='menu'] li",
];

export async function scrapeInstagramPosts(username?: string): Promise<InstagramPost[]> {
  const cookie = resolveCookie();
  if (!cookie) {
    logger.warn("instagram.scraper.no_cookie");
    return [];
  }

  try {
    const profileUrl = username ? `https://www.instagram.com/${username}/` : "https://www.instagram.com/";

    const posts = await withPage(async (page: PlaywrightPage) => {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval(POST_SELECTORS.join(","), (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const img = el.querySelector("img");
          const captionEl = el.querySelector("figcaption");
          const likeEl = el.querySelector("[aria-label*='like']");
          const commentEl = el.querySelector("[aria-label*='comment']");

          return {
            id: el.getAttribute("data-media-id") || el.getAttribute("id") || "",
            caption: captionEl?.textContent?.trim() || "",
            imageUrl: img?.getAttribute("src") || "",
            likes: parseEngagementNumber(likeEl?.getAttribute("aria-label") || ""),
            comments: parseEngagementNumber(commentEl?.getAttribute("aria-label") || ""),
            timestamp: new Date(),
          };
        });
      });

      return scraped.filter((p) => p.id || p.caption);
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".instagram.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("instagram.scraper.complete", { postCount: posts.length, username });
    return posts;
  } catch (err) {
    logger.error("instagram.scraper.failed", { error: String(err), username });
    return [];
  }
}

export async function scrapeInstagramComments(postUrl: string): Promise<InstagramComment[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval(COMMENT_SELECTORS.join(","), (elements: Element[]) => {
        return elements.slice(0, 50).map((el) => {
          const author = el.querySelector("a[role='link']");
          const text = el.querySelector("span[dir='auto']");
          const time = el.querySelector("time");

          return {
            id: el.getAttribute("id") || "",
            authorName: author?.textContent?.trim() || "",
            content: text?.textContent?.trim() || "",
            timestamp: time ? new Date(time.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".instagram.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("instagram.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeInstagramDMs(): Promise<unknown[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://www.instagram.com/direct/inbox/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const dms = await page.evaluate(() => {
        const threads = document.querySelectorAll("div[role='row']");
        return Array.from(threads).map((el) => ({
          id: el.getAttribute("id") || "",
          author: el.textContent?.trim() || "",
          timestamp: new Date(),
        }));
      });

      return dms;
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".instagram.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("instagram.scraper.dms_failed", { error: String(err) });
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
