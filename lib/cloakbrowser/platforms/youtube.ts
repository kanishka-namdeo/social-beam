import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const SID_COOKIE_ENV = "YOUTUBE_SID_COOKIE";
const SECURE_PSID_COOKIE_ENV = "YOUTUBE_SECURE_1PSID_COOKIE";

let cachedSid: string | null = null;
let cachedPsid: string | null = null;

function resolveCookies(): { sid: string | null; psid: string | null } {
  if (cachedSid && cachedPsid) return { sid: cachedSid, psid: cachedPsid };

  const sid = loadCookie("youtube-sid", SID_COOKIE_ENV);
  if (sid) cachedSid = sid;

  const psid = loadCookie("youtube-psid", SECURE_PSID_COOKIE_ENV);
  if (psid) cachedPsid = psid;

  return { sid, psid };
}

export interface YouTubeComment {
  id: string;
  authorName: string;
  content: string;
  likes: number;
  timestamp: Date;
  parentId?: string;
}

export interface YouTubeMention {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export async function scrapeYouTubeComments(videoUrl: string): Promise<YouTubeComment[]> {
  const { sid, psid } = resolveCookies();
  if (!sid) {
    logger.warn("youtube.scraper.no_cookie");
    return [];
  }

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(videoUrl, { waitUntil: "networkidle", timeout: 30000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('ytd-comment-thread-renderer, ytd-comment-view-model, [id*="comment"]', (elements: Element[]) => {
        return elements.slice(0, 50).map((el) => {
          const authorEl = el.querySelector('#author-text, yt-formatted-string#author-text, [id*="author"]');
          const textEl = el.querySelector('#content-text, [id*="content"], yt-formatted-string#content-text');
          const likeEl = el.querySelector('#vote-count-middle, [id*="vote-count"], [aria-label*="like"]');
          const timeEl = el.querySelector('a[href*="lc="], yt-formatted-string#published-time-text');

          return {
            id: el.getAttribute("comment-id") || el.id || "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            likes: parseInt(likeEl?.textContent?.replace(/[^0-9]/g, "") || "0", 10),
            timestamp: new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [
        {
          name: "SID",
          value: sid,
          domain: ".youtube.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None" as const,
        },
        ...(psid ? [{
          name: "__Secure-1PSID",
          value: psid,
          domain: ".youtube.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None" as "None",
        }] : []),
      ],
      stealth: true,
      timeoutMs: 60000,
    });
  } catch (err) {
    logger.error("youtube.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeYouTubeChannelPosts(channelId?: string): Promise<unknown[]> {
  const { sid } = resolveCookies();
  if (!sid) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      const communityUrl = channelId
        ? `https://www.youtube.com/channel/${channelId}/community`
        : "https://www.youtube.com/feed/history";

      await page.goto(communityUrl, { waitUntil: "networkidle", timeout: 30000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const posts = await page.$$eval('ytd-backstage-post-thread-renderer, ytd-rich-item-renderer', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('#content-text, yt-formatted-string#content');
          const authorEl = el.querySelector('#channel-name, yt-formatted-string#channel-name');

          return {
            id: "",
            authorName: authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: new Date(),
          };
        });
      });

      return posts.filter((p) => p.content);
    }, {
      cookies: [
        {
          name: "SID",
          value: sid,
          domain: ".youtube.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None",
        },
      ],
      stealth: true,
      timeoutMs: 60000,
    });
  } catch (err) {
    logger.error("youtube.scraper.channel_posts_failed", { error: String(err) });
    return [];
  }
}

export async function scrapeYouTubeMentions(): Promise<YouTubeMention[]> {
  const { sid } = resolveCookies();
  if (!sid) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto("https://www.youtube.com/notifications", { waitUntil: "networkidle", timeout: 30000 });
      await delay(3000);

      const mentions = await page.$$eval('ytd-notification-renderer, ytd-rich-notification-renderer', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const textEl = el.querySelector('#message, yt-formatted-string#message');
          const authorEl = el.querySelector('a#channel-name, yt-formatted-string#channel-name');

          return {
            id: el.getAttribute("notification-id") || "",
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
          name: "SID",
          value: sid,
          domain: ".youtube.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None",
        },
      ],
      stealth: true,
      timeoutMs: 60000,
    });
  } catch (err) {
    logger.error("youtube.scraper.mentions_failed", { error: String(err) });
    return [];
  }
}

async function autoScrollForLazyLoad(page: PlaywrightPage, maxScrolls = 10): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(800);
  }
}
