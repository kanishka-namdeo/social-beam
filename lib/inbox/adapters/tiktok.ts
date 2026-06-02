import { logger } from '@/lib/logger';
import { decryptToken } from '@/lib/oauth/crypto';
import type { EngagementAdapter, RawComment, RawDM, RawMention } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';

const TIKTOK_BASE_URL = 'https://open.tiktokapis.com/v2';

export function createTiktokInboxAdapter(encryptedToken: string): EngagementAdapter {
  return {
    platform: 'tiktok' as PlatformName,

    async fetchComments(): Promise<RawComment[]> {
      // TikTok comment list requires video_id — we'd need to fetch user videos first
      // For MVP, return empty as TikTok comment API requires Business API access
      logger.info('inbox.tiktok.comments_not_available', { reason: 'requires Business API access' });
      return [];
    },

    async fetchMentions(): Promise<RawMention[]> {
      // TikTok mentions not available via official API
      return [];
    },

    async fetchDMs(): Promise<RawDM[]> {
      // TikTok DMs not available via official API
      return [];
    },

    async replyToComment(): Promise<{ success: boolean; error?: string }> {
      return { success: false, error: 'TikTok comment replies require Business API access' };
    },

    async replyToDM(): Promise<{ success: boolean; error?: string }> {
      return { success: false, error: 'TikTok DMs not available via API' };
    },
  };
}
