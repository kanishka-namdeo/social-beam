import { logger } from '@/lib/logger';
import type { EngagementAdapter, RawComment, RawMention, RawDM } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';
import { createTiktokInboxAdapter } from './tiktok';
import { scrapeTikTokPosts, scrapeTikTokComments, scrapeTikTokDMs } from '@/lib/cloakbrowser/platforms/tiktok';

export function createTikTokHybridAdapter(encryptedToken: string): EngagementAdapter {
  const apiAdapter = createTiktokInboxAdapter(encryptedToken);

  return {
    platform: 'tiktok' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      try {
        const apiResult = await apiAdapter.fetchComments(since);
        if (apiResult.length > 0) return apiResult;
      } catch (err) {
        logger.warn('inbox.tiktok.api_failed_using_browser', { error: String(err) });
      }

      try {
        const posts = await scrapeTikTokPosts();
        const comments: RawComment[] = [];
        for (const post of posts.slice(0, 5)) {
          if (post.videoUrl) {
            const postComments = await scrapeTikTokComments(post.videoUrl);
            comments.push(...postComments.map((c) => ({
              platformItemId: post.id,
              authorName: c.authorName,
              content: c.content,
              createdAt: c.timestamp,
            })));
          }
        }
        return comments;
      } catch (browserErr) {
        logger.error('inbox.tiktok.browser_fallback_failed', { error: String(browserErr) });
        return [];
      }
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      logger.info('inbox.tiktok.mentions_not_supported');
      return [];
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      try {
        return await apiAdapter.fetchDMs(since);
      } catch (err) {
        logger.warn('inbox.tiktok.dms_api_failed_using_browser', { error: String(err) });
        try {
          const dms = await scrapeTikTokDMs();
          return dms.map((d) => ({
            platformItemId: (d as any).id || '',
            conversationId: (d as any).id || '',
            authorName: (d as any).author || '',
            content: (d as any).content || '',
            createdAt: (d as any).timestamp || new Date(),
          }));
        } catch (browserErr) {
          logger.error('inbox.tiktok.dms_browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return apiAdapter.replyToComment(platformItemId, text);
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return apiAdapter.replyToDM(conversationId, text);
    },
  };
}
