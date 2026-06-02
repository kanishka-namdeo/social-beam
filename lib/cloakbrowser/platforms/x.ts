import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const AUTH_TOKEN_ENV = "TWITTER_AUTH_TOKEN_COOKIE";
const CT0_TOKEN_ENV = "TWITTER_CT0_COOKIE";

let cachedAuthToken: string | null = null;
let cachedCt0: string | null = null;

function resolveAuthCookie(): { authToken: string | null; ct0: string | null } {
  if (cachedAuthToken && cachedCt0) return { authToken: cachedAuthToken, ct0: cachedCt0 };

  const authToken = loadCookie("x-auth-token", AUTH_TOKEN_ENV);
  if (authToken) cachedAuthToken = authToken;

  const ct0 = loadCookie("x-ct0", CT0_TOKEN_ENV);
  if (ct0) cachedCt0 = ct0;

  return { authToken, ct0 };
}

export interface XPost {
  id: string;
  text: string;
  author: string;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: Date;
}

export interface XComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

export interface XMention {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export async function scrapeXPosts(handle?: string): Promise<XPost[]> {
  const { authToken } = resolveAuthCookie();
  if (!authToken) {
    logger.warn("x.scraper.no_cookie");
    return [];
  }

  try {
    const profileUrl = handle ? `https://x.com/${handle}` : "https://x.com/home";

    const posts = await withPage(async (page: PlaywrightPage) => {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval('article[data-testid="tweet"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('div[data-testid="tweetText"]');
          const authorEl = el.querySelector('a[role="link"]');
          const timeEl = el.querySelector("time");
          const likeEl = el.querySelector('[data-testid="unlike"]') || el.querySelector('[data-testid="like"]');
          const rtEl = el.querySelector('[data-testid="unretweet"]') || el.querySelector('[data-testid="retweet"]');
          const replyEl = el.querySelector('[data-testid="reply"]');

          const likes = parseInt(likeEl?.getAttribute("aria-label")?.replace(/[^0-9]/g, "") || "0", 10);
          const retweets = parseInt(rtEl?.getAttribute("aria-label")?.replace(/[^0-9]/g, "") || "0", 10);
          const replies = parseInt(replyEl?.getAttribute("aria-label")?.replace(/[^0-9]/g, "") || "0", 10);

          return {
            id: el.getAttribute("data-tweet-id") || el.closest("[data-tweet-id]")?.getAttribute("data-tweet-id") || "",
            text: textEl?.textContent?.trim() || "",
            author: authorEl?.textContent?.trim() || "",
            likes: likes || 0,
            retweets: retweets || 0,
            replies: replies || 0,
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return scraped.filter((p) => p.text);
    }, {
      cookies: [
        {
          name: "auth_token",
          value: authToken,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        ...(cachedCt0 ? [{
          name: "ct0",
          value: cachedCt0,
          domain: ".x.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax" as const,
        }] : []),
      ],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("x.scraper.complete", { postCount: posts.length, handle });
    return posts;
  } catch (err) {
    logger.error("x.scraper.failed", { error: String(err), handle });
    return [];
  }
}

export async function scrapeXComments(tweetUrl: string): Promise<XComment[]> {
  const { authToken } = resolveAuthCookie();
  if (!authToken) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(tweetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('article[data-testid="tweet"]', (elements: Element[]) => {
        return elements.slice(1, 51).map((el) => {
          const textEl = el.querySelector('div[data-testid="tweetText"]');
          const authorEl = el.querySelector('a[role="link"]');
          const timeEl = el.querySelector("time");

          return {
            id: "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [
        {
          name: "auth_token",
          value: authToken,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        ...(cachedCt0 ? [{
          name: "ct0",
          value: cachedCt0,
          domain: ".x.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax" as const,
        }] : []),
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("x.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeXMentions(): Promise<XMention[]> {
  const { authToken } = resolveAuthCookie();
  if (!authToken) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://x.com/notifications", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const mentions = await page.$$eval('article[data-testid="tweet"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('div[data-testid="tweetText"]');
          const authorEl = el.querySelector('a[role="link"]');
          const timeEl = el.querySelector("time");

          return {
            id: "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return mentions.filter((m) => m.content);
    }, {
      cookies: [
        {
          name: "auth_token",
          value: authToken,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        ...(cachedCt0 ? [{
          name: "ct0",
          value: cachedCt0,
          domain: ".x.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax" as const,
        }] : []),
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("x.scraper.mentions_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeXDMs(): Promise<unknown[]> {
  const { authToken } = resolveAuthCookie();
  if (!authToken) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://x.com/messages", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const dms = await page.evaluate(() => {
        const conversations = document.querySelectorAll('div[data-testid="conversation"]');
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
          name: "auth_token",
          value: authToken,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        ...(cachedCt0 ? [{
          name: "ct0",
          value: cachedCt0,
          domain: ".x.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "Lax" as const,
        }] : []),
      ],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("x.scraper.dms_failed", { error: String(err) });
    return [];
  }
}

async function autoScrollForLazyLoad(page: PlaywrightPage, maxScrolls = 10): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(800);
  }
}
