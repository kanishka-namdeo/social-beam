import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const C_USER_COOKIE_ENV = "FACEBOOK_C_USER_COOKIE";
const XS_COOKIE_ENV = "FACEBOOK_XS_COOKIE";

let cachedCUser: string | null = null;
let cachedXs: string | null = null;

function resolveCookies(): { cUser: string | null; xs: string | null } {
  if (cachedCUser && cachedXs) return { cUser: cachedCUser, xs: cachedXs };

  const cUser = loadCookie("facebook-c-user", C_USER_COOKIE_ENV);
  if (cUser) cachedCUser = cUser;

  const xs = loadCookie("facebook-xs", XS_COOKIE_ENV);
  if (xs) cachedXs = xs;

  return { cUser, xs };
}

export interface FacebookPost {
  id: string;
  text: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: Date;
}

export interface FacebookComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

export interface FacebookMention {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export async function scrapeFacebookPosts(pageId?: string): Promise<FacebookPost[]> {
  const { cUser, xs } = resolveCookies();
  if (!cUser || !xs) {
    logger.warn("facebook.scraper.no_cookie");
    return [];
  }

  try {
    const feedUrl = pageId ? `https://www.facebook.com/${pageId}` : "https://www.facebook.com/";

    const posts = await withPage(async (page: PlaywrightPage) => {
      await page.goto(feedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval('[data-pagelet], div[role="article"], div[data-testid="fbfeed_post"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('[data-testid="post_content"], p[dir="auto"], span[dir="auto"]');
          const authorEl = el.querySelector('a[role="link"], h3, strong');
          const likeEl = el.querySelector('[aria-label*="reaction"], [aria-label*="Like"]');
          const commentEl = el.querySelector('[aria-label*="comment"]');
          const shareEl = el.querySelector('[aria-label*="share"]');

          return {
            id: el.getAttribute("data-ft") || el.getAttribute("data-post-id") || "",
            text: textEl?.textContent?.trim() || "",
            author: authorEl?.textContent?.trim() || "",
            likes: parseEngagementNumber(likeEl?.getAttribute("aria-label") || ""),
            comments: parseEngagementNumber(commentEl?.getAttribute("aria-label") || ""),
            shares: parseEngagementNumber(shareEl?.getAttribute("aria-label") || ""),
            timestamp: new Date(),
          };
        });
      });

      return scraped.filter((p) => p.text || p.author);
    }, {
      cookies: [
        {
          name: "c_user",
          value: cUser,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "xs",
          value: xs,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("facebook.scraper.complete", { postCount: posts.length, pageId });
    return posts;
  } catch (err) {
    logger.error("facebook.scraper.failed", { error: String(err), pageId });
    return [];
  }
}

export async function scrapeFacebookComments(postUrl: string): Promise<FacebookComment[]> {
  const { cUser, xs } = resolveCookies();
  if (!cUser || !xs) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('[data-comment-body], div[role="comment"], div[class*="comment"]', (elements: Element[]) => {
        return elements.slice(0, 50).map((el) => {
          const authorEl = el.querySelector('a[role="link"], strong, span[dir="auto"]');
          const textEl = el.querySelector('[data-comment-body], p[dir="auto"], span[dir="auto"]');
          const timeEl = el.querySelector('abbr[data-short-content], time');

          return {
            id: el.getAttribute("data-comment-id") || "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("data-utime") || timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [
        {
          name: "c_user",
          value: cUser,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "xs",
          value: xs,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("facebook.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeFacebookMentions(): Promise<FacebookMention[]> {
  const { cUser, xs } = resolveCookies();
  if (!cUser || !xs) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://www.facebook.com/notifications", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const mentions = await page.$$eval('div[role="article"], div[class*="Notification"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('span[dir="auto"], p, div[class*="text"]');
          const authorEl = el.querySelector('a[role="link"], strong');

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
      cookies: [
        {
          name: "c_user",
          value: cUser,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "xs",
          value: xs,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("facebook.scraper.mentions_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeFacebookDMs(): Promise<unknown[]> {
  const { cUser, xs } = resolveCookies();
  if (!cUser || !xs) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://www.facebook.com/messages", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const dms = await page.evaluate(() => {
        const conversations = document.querySelectorAll('div[role="row"], div[class*="conversation"]');
        return Array.from(conversations).map((el) => ({
          id: "",
          author: el.textContent?.trim() || "",
          timestamp: new Date(),
        }));
      });

      return dms;
    }, {
      cookies: [
        {
          name: "c_user",
          value: cUser,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: "xs",
          value: xs,
          domain: ".facebook.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("facebook.scraper.dms_failed", { error: String(err) });
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
