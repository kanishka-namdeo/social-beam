import { logger } from "@/lib/logger";
import type { RawMention } from "@/lib/inbox/types";
import { withLinkedInPageForUser } from "@/lib/linkedin/browser";
import {
  delay,
  withRetry,
  isLinkedInLoginPage,
  LinkedInCookieExpiredError,
} from "@/lib/linkedin/scraping-utils";

const NOTIFICATIONS_URL = "https://www.linkedin.com/notifications/?filter=mentions";
const PAGE_LOAD_TIMEOUT_MS = 30000;
const MAX_NOTIFICATIONS = 50;

/**
 * Scrape mentions from LinkedIn's notifications page.
 *
 * LinkedIn groups all mention-type notifications under the "Mentions" filter.
 * Each notification contains:
 * - Author name + avatar (in a link to the author's profile)
 * - Notification text (e.g. "mentioned you in a post")
 * - Timestamp (relative, e.g. "2h", "1d")
 * - Read/unread status (via "Unread notification." text prefix)
 * - Link to the original content
 */
export async function scrapeLinkedInMentions(
  workspaceId: string,
  since?: Date,
): Promise<RawMention[]> {
  logger.info("linkedin.mention_scraper.start", { workspaceId });

  try {
    const result = await withRetry("scrapeLinkedInMentions", async () =>
      withLinkedInPageForUser(workspaceId, async (page) => {
        const mentions: RawMention[] = [];

        await page.goto(NOTIFICATIONS_URL, {
          waitUntil: "domcontentloaded",
          timeout: PAGE_LOAD_TIMEOUT_MS,
        });

        await delay(3000);

        const currentUrl = page.url();
        if (isLinkedInLoginPage(currentUrl)) {
          throw new Error("LinkedIn cookie expired");
        }

        // Wait for notifications to load
        try {
          await page.waitForSelector("main", { timeout: 10000 });
          await delay(2000);
        } catch {
          logger.warn("linkedin.mention_scraper.main_not_found");
          return mentions;
        }

        // Extract mention data from the notifications page
        const notificationData = await page.evaluate(
          (maxCount: number) => {
            const results: Array<{
              authorName: string;
              authorProfileUrl: string | null;
              authorAvatar: string | null;
              content: string;
              platformUrl: string | null;
              isUnread: boolean;
              timeText: string;
            }> = [];

            // Each notification is a link inside <main>
            const mainEl = document.querySelector("main");
            if (!mainEl) return results;

            // Notifications are structured as:
            // <link to profile with avatar> + <link to notification content> + <time text>
            // We need to find notification groups
            const allLinks = Array.from(mainEl.querySelectorAll("a[href]"));

            // Group notifications: each notification starts with a profile link containing an image
            let i = 0;
            while (i < allLinks.length && results.length < maxCount) {
              const link = allLinks[i];
              const img = link.querySelector("img[src*='media.licdn.com']");

              // This is a profile avatar link (start of a notification)
              if (img && link.getAttribute("href")?.includes("/in/")) {
                const authorProfileUrl = link.getAttribute("href");
                const authorAvatar = img.getAttribute("src");
                const authorAlt = img.getAttribute("alt") || "";

                // Extract author name from alt text or href
                let authorName = authorAlt
                  .replace(/^View /, "")
                  .replace(/'s profile$/, "")
                  .replace(/^Photo of /, "")
                  .replace(/,#OPEN_TO_WORK$/, "")
                  .trim();

                // If alt didn't give us a name, try the href
                if (!authorName || authorName.length < 2) {
                  const hrefMatch = authorProfileUrl?.match(/\/in\/([^/]+)/);
                  authorName = hrefMatch ? hrefMatch[1].replace(/-/g, " ") : "Unknown";
                }

                // Next link should be the notification content
                const contentLink = allLinks[i + 1];
                let content = "";
                let platformUrl: string | null = null;
                let isUnread = false;

                if (contentLink) {
                  const contentText = contentLink.textContent?.trim() || "";

                  // Check if it's a mention notification
                  const isMention =
                    contentText.toLowerCase().includes("mentioned you") ||
                    contentText.toLowerCase().includes("mentioned") ||
                    contentLink.getAttribute("href")?.includes("/feed/update/") ||
                    contentLink.getAttribute("href")?.includes("/posts/");

                  if (isMention) {
                    // Check for unread status
                    isUnread = contentText.includes("Unread notification");

                    // Clean up content - remove "Unread notification." prefix
                    content = contentText
                      .replace(/^Unread notification\.\s*/, "")
                      .trim();

                    platformUrl = contentLink.getAttribute("href");
                    if (platformUrl && !platformUrl.startsWith("http")) {
                      platformUrl = `https://www.linkedin.com${platformUrl}`;
                    }
                  }
                }

                // Find timestamp - look for the next text node that looks like a time
                let timeText = "";
                const nextSibling = contentLink?.nextElementSibling;
                if (nextSibling) {
                  timeText = nextSibling.textContent?.trim() || "";
                }

                if (content && content.length > 5) {
                  results.push({
                    authorName,
                    authorProfileUrl,
                    authorAvatar,
                    content,
                    platformUrl,
                    isUnread,
                    timeText,
                  });
                }

                i += 2; // Skip the content link we already processed
              } else {
                i++;
              }
            }

            return results;
          },
          MAX_NOTIFICATIONS,
        );

        for (const nd of notificationData as Array<{
          authorName: string;
          authorProfileUrl: string | null;
          authorAvatar: string | null;
          content: string;
          platformUrl: string | null;
          isUnread: boolean;
          timeText: string;
        }>) {
          if (!nd.content) continue;

          // Generate a stable ID from content + author
          const idText = `${nd.authorName}-${nd.content.slice(0, 80)}`;
          const platformItemId = `li-mention-${Buffer.from(idText).toString("base64url").slice(0, 24)}`;

          mentions.push({
            platformItemId,
            authorName: nd.authorName,
            authorAvatar: nd.authorAvatar || undefined,
            content: nd.content,
            platformUrl: nd.platformUrl || undefined,
            createdAt: new Date(), // Relative timestamps can't be parsed exactly
          });
        }

        return mentions;
      }),
    );

    logger.info("linkedin.mention_scraper.complete", {
      workspaceId,
      mentionsFound: result?.length ?? 0,
    });

    return result ?? [];
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      logger.warn("linkedin.mention_scraper.cookie_expired");
      return [];
    }
    logger.error("linkedin.mention_scraper.failed", { error: String(err) });
    return [];
  }
}
