import { scrapeLinkedInComments, postReplyToLinkedInComment } from '@/lib/inbox/scrapers/linkedin-scraper';
import { scrapeLinkedInMentions } from '@/lib/inbox/scrapers/linkedin-mention-scraper';
import { scrapeLinkedInDMs } from '@/lib/inbox/scrapers/linkedin-dm-scraper';
import type { EngagementAdapter, PlatformName, RawComment, RawDM, RawMention } from '@/lib/inbox/types';

/**
 * Create a LinkedIn engagement adapter backed by the browser scraper.
 * This uses Playwright/cloakbrowser to scrape LinkedIn's web interface
 * instead of the official REST API.
 */
export function createLinkedinScraperAdapter(workspaceId: string): EngagementAdapter {
  return {
    platform: 'linkedin' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      return scrapeLinkedInComments(workspaceId, since);
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      return scrapeLinkedInMentions(workspaceId, since);
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      return scrapeLinkedInDMs(workspaceId, since);
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return postReplyToLinkedInComment(workspaceId, platformItemId, text);
    },

    async replyToDM(): Promise<{ success: boolean; error?: string }> {
      return { success: false, error: 'LinkedIn DMs not available via scraping' };
    },
  };
}
