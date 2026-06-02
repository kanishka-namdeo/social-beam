import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const SESSIONID_COOKIE_ENV = "TIKTOK_SESSIONID_COOKIE";

let cachedCookie: string | null = null;

function resolveCookie(): string | null {
  if (cachedCookie) return cachedCookie;
  const cookie = loadCookie("tiktok-sessionid", SESSIONID_COOKIE_ENV);
  if (cookie) cachedCookie = cookie;
  return cookie;
}

export interface TikTokPost {
  id: string;
  description: string;
  videoUrl: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timestamp: Date;
}

export interface TikTokComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

export async function scrapeTikTokPosts(username?: string): Promise<TikTokPost[]> {
  const cookie = resolveCookie();
  if (!cookie) {
    logger.warn("tiktok.scraper.no_cookie");
    return [];
  }

  try {
    const profileUrl = username ? `https://www.tiktok.com/@${username}` : "https://www.tiktok.com/foryou";

    const posts = await withPage(async (page: PlaywrightPage) => {
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval('[data-e2e="user-post-item"], [data-e2e="challenge-item"], a', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const videoEl = el.querySelector("video");
          const imgEl = el.querySelector("img");
          const statsEl = el.querySelector('[data-e2e="video-count"]') || el.querySelector("strong");
          const descEl = el.querySelector("span, p, div[class*='Desc']");

          const likes = parseInt(el.querySelector('[data-e2e="like-count"]')?.textContent || "0", 10);
          const comments = parseInt(el.querySelector('[data-e2e="comment-count"]')?.textContent || "0", 10);
          const shares = parseInt(el.querySelector('[data-e2e="share-count"]')?.textContent || "0", 10);
          const views = parseInt(el.querySelector('[data-e2e="play-count"]')?.textContent || "0", 10);

          return {
            id: el.getAttribute("data-e2e-video-id") || el.getAttribute("href") || "",
            description: descEl?.textContent?.trim() || "",
            videoUrl: videoEl?.getAttribute("src") || imgEl?.getAttribute("src") || "",
            likes: likes || 0,
            comments: comments || 0,
            shares: shares || 0,
            views: views || 0,
            timestamp: new Date(),
          };
        });
      });

      return scraped.filter((p) => p.description || p.videoUrl);
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".tiktok.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("tiktok.scraper.complete", { postCount: posts.length, username });
    return posts;
  } catch (err) {
    logger.error("tiktok.scraper.failed", { error: String(err), username });
    return [];
  }
}

export async function scrapeTikTokComments(videoUrl: string): Promise<TikTokComment[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(videoUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      const commentButton = await page.$('[data-e2e="comment-icon"], [aria-label*="comment"]');
      if (commentButton) {
        await commentButton.click();
        await delay(2000);
      }

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('[data-e2e="comment-level1"], [data-e2e="comment-item"], div[class*="CommentItem"]', (elements: Element[]) => {
        return elements.slice(0, 50).map((el) => {
          const authorEl = el.querySelector('a, span[class*="User"], div[class*="Author"]');
          const textEl = el.querySelector('p, span[data-e2e="comment-level"], div[class*="CommentText"]');
          const timeEl = el.querySelector('time, span[class*="Time"]');

          return {
            id: el.getAttribute("data-comment-id") || "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".tiktok.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("tiktok.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeTikTokDMs(): Promise<unknown[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://www.tiktok.com/messages", { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      const dms = await page.evaluate(() => {
        const conversations = document.querySelectorAll('div[class*="message"], li[class*="Conversation"]');
        return Array.from(conversations).map((el) => ({
          id: "",
          author: el.textContent?.trim() || "",
          timestamp: new Date(),
        }));
      });

      return dms;
    }, {
      cookies: [{
        name: "sessionid",
        value: cookie,
        domain: ".tiktok.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("tiktok.scraper.dms_failed", { error: String(err) });
    return [];
  }
}

async function autoScrollForLazyLoad(page: PlaywrightPage, maxScrolls = 15): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(1000);
  }
}
