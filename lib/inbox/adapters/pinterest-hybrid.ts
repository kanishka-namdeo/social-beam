import { logger } from '@/lib/logger';
import type { EngagementAdapter, RawComment, RawMention, RawDM } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';
import { scrapePinterestPins, scrapePinterestComments } from '@/lib/cloakbrowser/platforms/pinterest';

export function createPinterestHybridAdapter(): EngagementAdapter {
  return {
    platform: 'pinterest' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      try {
        const pins = await scrapePinterestPins();
        const comments: RawComment[] = [];
        for (const pin of pins.slice(0, 5)) {
          if (pin.link) {
            const pinComments = await scrapePinterestComments(pin.link);
            comments.push(...pinComments.map((c) => ({
              platformItemId: pin.id,
              authorName: c.authorName,
              content: c.content,
              createdAt: c.timestamp,
            })));
          }
        }
        return comments;
      } catch (err) {
        logger.error('inbox.pinterest.browser_scrape_failed', { error: String(err) });
        return [];
      }
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      logger.info('inbox.pinterest.mentions_not_supported');
      return [];
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      logger.info('inbox.pinterest.dms_not_supported');
      return [];
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      logger.warn('inbox.pinterest.reply_not_supported');
      return { success: false, error: 'Pinterest replies not supported' };
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      logger.warn('inbox.pinterest.dm_reply_not_supported');
      return { success: false, error: 'Pinterest DM replies not supported' };
    },
  };
}
