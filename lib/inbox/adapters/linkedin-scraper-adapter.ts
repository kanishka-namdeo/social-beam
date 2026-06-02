import { scrapeLinkedInComments, postReplyToLinkedInComment } from '@/lib/inbox/scrapers/linkedin-scraper';
import type { EngagementAdapter, PlatformName, RawComment, RawDM, RawMention } from '@/lib/inbox/types';

/**
 * Create a LinkedIn engagement adapter backed by the browser scraper.
 * This uses Playwright/cloakbrowser to scrape LinkedIn's web interface
 * instead of the official REST API.
 */
export function createLinkedinScraperAdapter(): EngagementAdapter {
  return {
    platform: 'linkedin' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      return scrapeLinkedInComments(since);
    },

    async fetchMentions(_since?: Date): Promise<RawMention[]> {
      // Not supported via scraping
      return [];
    },

    async fetchDMs(_since?: Date): Promise<RawDM[]> {
      // Not supported via scraping
      return [];
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return postReplyToLinkedInComment(platformItemId, text);
    },

    async replyToDM(): Promise<{ success: boolean; error?: string }> {
      return { success: false, error: 'LinkedIn DMs not available via scraping' };
    },
  };
}
