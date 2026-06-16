import { logger } from "@/lib/logger";
import type { RawDM } from "@/lib/inbox/types";
import { withLinkedInPageForUser } from "@/lib/linkedin/browser";
import {
  delay,
  withRetry,
  isLinkedInLoginPage,
  LinkedInCookieExpiredError,
} from "@/lib/linkedin/scraping-utils";

const MESSAGING_URL = "https://www.linkedin.com/messaging/";
const PAGE_LOAD_TIMEOUT_MS = 30000;
const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES_PER_CONVERSATION = 10;

/**
 * Scrape direct messages from LinkedIn's messaging page.
 *
 * LinkedIn's messaging interface shows:
 * - Conversation list on the left with participant name + last message preview
 * - Message thread on the right when a conversation is selected
 * - Each message has: sender, content, timestamp, read status
 */
export async function scrapeLinkedInDMs(
  workspaceId: string,
  since?: Date,
): Promise<RawDM[]> {
  logger.info("linkedin.dm_scraper.start", { workspaceId });

  try {
    const result = await withRetry("scrapeLinkedInDMs", async () =>
      withLinkedInPageForUser(workspaceId, async (page) => {
        const dms: RawDM[] = [];

        await page.goto(MESSAGING_URL, {
          waitUntil: "domcontentloaded",
          timeout: PAGE_LOAD_TIMEOUT_MS,
        });

        await delay(3000);

        const currentUrl = page.url();
        if (isLinkedInLoginPage(currentUrl)) {
          throw new Error("LinkedIn cookie expired");
        }

        // Wait for messaging interface to load
        try {
          await page.waitForSelector('[data-test-id="messaging"], .msg-overlay-list-bubble, [role="main"]', { timeout: 10000 });
          await delay(2000);
        } catch {
          logger.warn("linkedin.dm_scraper.messaging_not_found");
          return dms;
        }

        // Extract conversations from the messaging page
        const conversationsData = await page.evaluate(
          (maxConversations: number) => {
            const results: Array<{
              conversationId: string;
              participantName: string;
              participantUrl: string | null;
              participantAvatar: string | null;
              lastMessage: string;
              timestamp: string;
              isUnread: boolean;
            }> = [];

            // LinkedIn messaging uses various container patterns
            // Try multiple selectors for conversation list items
            const conversationSelectors = [
              '[data-test-id="msg-conversation"]',
              '.msg-conversation-list__item',
              'li[role="listitem"]',
              '[role="option"]',
            ];

            let conversationItems: Element[] = [];
            for (const selector of conversationSelectors) {
              const items = Array.from(document.querySelectorAll(selector));
              if (items.length > 0) {
                conversationItems = items;
                break;
              }
            }

            // If no specific selectors work, try to find conversation-like elements
            if (conversationItems.length === 0) {
              // Look for elements with profile links and message previews
              const allLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
              const uniqueProfiles = new Map<string, Element>();

              for (const link of allLinks) {
                const href = link.getAttribute("href");
                if (href && !uniqueProfiles.has(href)) {
                  const parent = link.closest('li, [role="listitem"], [role="option"]');
                  if (parent) {
                    uniqueProfiles.set(href, parent);
                  }
                }
              }

              conversationItems = Array.from(uniqueProfiles.values());
            }

            for (let i = 0; i < Math.min(conversationItems.length, maxConversations); i++) {
              const item = conversationItems[i];

              // Extract participant info
              const profileLink = item.querySelector('a[href*="/in/"]') as HTMLAnchorElement;
              const participantUrl = profileLink?.getAttribute("href");
              const participantName = profileLink?.textContent?.trim() || "Unknown";

              // Extract avatar
              const avatarImg = item.querySelector('img[src*="media.licdn.com"]');
              const participantAvatar = avatarImg?.getAttribute("src") || null;

              // Extract last message preview
              const messagePreview = item.querySelector('.msg-conversation-list__message-preview, [data-test-id="last-message"], p');
              const lastMessage = messagePreview?.textContent?.trim() || "";

              // Extract timestamp
              const timeEl = item.querySelector('time, [data-test-id="time"], .msg-conversation-list__timestamp');
              const timestamp = timeEl?.getAttribute("datetime") || timeEl?.textContent?.trim() || "";

              // Check if unread (usually indicated by a badge or bold text)
              const isUnread = item.classList.contains("msg-conversation-list-item--unread") ||
                               item.querySelector('[data-test-id="unread-indicator"]') !== null ||
                               item.getAttribute("aria-label")?.includes("unread") || false;

              // Generate conversation ID from participant URL
              const conversationId = participantUrl?.replace(/[^a-z0-9]/gi, "_") || `conv_${i}`;

              if (lastMessage && lastMessage.length > 0) {
                results.push({
                  conversationId,
                  participantName,
                  participantUrl,
                  participantAvatar,
                  lastMessage,
                  timestamp,
                  isUnread,
                });
              }
            }

            return results;
          },
          MAX_CONVERSATIONS,
        );

        // Convert conversation data to RawDM format
        for (const conv of conversationsData as Array<{
          conversationId: string;
          participantName: string;
          participantUrl: string | null;
          participantAvatar: string | null;
          lastMessage: string;
          timestamp: string;
          isUnread: boolean;
        }>) {
          if (!conv.lastMessage) continue;

          // Generate stable ID from conversation + message content
          const idText = `${conv.conversationId}-${conv.lastMessage.slice(0, 50)}`;
          const platformItemId = `li-dm-${Buffer.from(idText).toString("base64url").slice(0, 24)}`;

          // Parse timestamp (may be relative like "2h" or absolute)
          let createdAt = new Date();
          if (conv.timestamp) {
            // Try parsing as ISO date first
            const parsed = new Date(conv.timestamp);
            if (!isNaN(parsed.getTime())) {
              createdAt = parsed;
            }
            // For relative timestamps, we'll use current time as approximation
          }

          dms.push({
            platformItemId,
            conversationId: conv.conversationId,
            authorName: conv.participantName,
            authorAvatar: conv.participantAvatar || undefined,
            content: conv.lastMessage,
            platformUrl: conv.participantUrl ? `https://www.linkedin.com${conv.participantUrl}` : undefined,
            createdAt,
          });
        }

        return dms;
      }),
    );

    logger.info("linkedin.dm_scraper.complete", {
      workspaceId,
      dmsFound: result?.length ?? 0,
    });

    return result ?? [];
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      logger.warn("linkedin.dm_scraper.cookie_expired");
      return [];
    }
    logger.error("linkedin.dm_scraper.failed", { error: String(err) });
    return [];
  }
}
