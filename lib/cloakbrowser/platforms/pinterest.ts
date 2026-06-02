import { withPage, loadCookie, saveCookie, delay } from "@/lib/cloakbrowser";
import { logger } from "@/lib/logger";
import type { PlaywrightPage } from "../platforms/types";

const SESSION_COOKIE_ENV = "PINTEREST_SESSION_COOKIE";

let cachedCookie: string | null = null;

function resolveCookie(): string | null {
  if (cachedCookie) return cachedCookie;
  const cookie = loadCookie("pinterest-session", SESSION_COOKIE_ENV);
  if (cookie) cachedCookie = cookie;
  return cookie;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  saves: number;
  comments: number;
  timestamp: Date;
}

export interface PinterestComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: Date;
  parentId?: string;
}

export async function scrapePinterestPins(boardId?: string): Promise<PinterestPin[]> {
  const cookie = resolveCookie();
  if (!cookie) {
    logger.warn("pinterest.scraper.no_cookie");
    return [];
  }

  try {
    const boardUrl = boardId ? `https://www.pinterest.com/${boardId}/` : "https://www.pinterest.com/";

    const pins = await withPage(async (page: PlaywrightPage) => {
      await page.goto(boardUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(3000);

      await autoScrollForLazyLoad(page);

      const scraped = await page.$$eval('[data-test-id="pin"], [data-test-id="visualPin"], a[class*="Pin"]', (elements: Element[]) => {
        return elements.slice(0, 25).map((el) => {
          const imgEl = el.querySelector("img");
          const titleEl = el.querySelector("h3, [class*='Title'], span[class*='title']");
          const descEl = el.querySelector("p, [class*='Description'], span[class*='description']");
          const savesEl = el.querySelector('[class*="saves"], [aria-label*="saves"]');
          const linkEl = el.querySelector("a");

          return {
            id: el.getAttribute("data-pin-id") || el.getAttribute("data-test-pin-id") || "",
            title: titleEl?.textContent?.trim() || "",
            description: descEl?.textContent?.trim() || "",
            imageUrl: imgEl?.getAttribute("src") || "",
            link: linkEl?.getAttribute("href") || "",
            saves: parseInt(savesEl?.textContent || "0", 10),
            comments: 0,
            timestamp: new Date(),
          };
        });
      });

      return scraped.filter((p) => p.title || p.description);
    }, {
      cookies: [{
        name: "_pinterest_sess",
        value: cookie,
        domain: ".pinterest.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });

    logger.info("pinterest.scraper.complete", { pinCount: pins.length, boardId });
    return pins;
  } catch (err) {
    logger.error("pinterest.scraper.failed", { error: String(err), boardId });
    return [];
  }
}

export async function scrapePinterestComments(pinUrl: string): Promise<PinterestComment[]> {
  const cookie = resolveCookie();
  if (!cookie) return [];

  try {
    return await withPage(async (page: PlaywrightPage) => {
      await page.goto(pinUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await delay(2000);

      await autoScrollForLazyLoad(page);

      const comments = await page.$$eval('[data-test-id="comment"], div[class*="Comment"], [class*="comment"]', (elements: Element[]) => {
        return elements.slice(0, 50).map((el) => {
          const authorEl = el.querySelector('a[class*="User"], img[alt], span[class*="name"]');
          const textEl = el.querySelector('p, span[class*="text"], div[class*="body"]');
          const timeEl = el.querySelector('time, span[class*="time"]');

          return {
            id: el.getAttribute("data-comment-id") || "",
            authorName: authorEl?.getAttribute("alt") || authorEl?.textContent?.trim() || "",
            content: textEl?.textContent?.trim() || "",
            timestamp: timeEl ? new Date(timeEl.getAttribute("datetime") || "") : new Date(),
          };
        });
      });

      return comments.filter((c) => c.content);
    }, {
      cookies: [{
        name: "_pinterest_sess",
        value: cookie,
        domain: ".pinterest.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }],
      stealth: true,
      timeoutMs: 45000,
    });
  } catch (err) {
    logger.error("pinterest.scraper.comments_failed", { error: String(err) });
    return [];
  }
}

async function autoScrollForLazyLoad(page: PlaywrightPage, maxScrolls = 15): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await delay(800);
  }
}
