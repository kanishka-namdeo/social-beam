import { logger } from '@/lib/logger';
import type { EngagementAdapter, RawComment, RawMention, RawDM } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';
import { createXInboxAdapter } from './x';
import { scrapeXPosts, scrapeXComments, scrapeXMentions, scrapeXDMs } from '@/lib/cloakbrowser/platforms/x';

export function createXHybridAdapter(encryptedToken: string): EngagementAdapter {
  const apiAdapter = createXInboxAdapter(encryptedToken);

  return {
    platform: 'x' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      try {
        return await apiAdapter.fetchComments(since);
      } catch (err) {
        logger.warn('inbox.x.api_failed_using_browser', { error: String(err) });
        try {
          const posts = await scrapeXPosts();
          const comments: RawComment[] = [];
          for (const post of posts.slice(0, 5)) {
            const postComments = await scrapeXComments(`https://x.com/i/status/${post.id}`);
            comments.push(...postComments.map((c) => ({
              platformItemId: post.id,
              authorName: c.authorName,
              content: c.content,
              createdAt: c.timestamp,
            })));
          }
          return comments;
        } catch (browserErr) {
          logger.error('inbox.x.browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      try {
        return await apiAdapter.fetchMentions(since);
      } catch (err) {
        logger.warn('inbox.x.mentions_api_failed_using_browser', { error: String(err) });
        try {
          const mentions = await scrapeXMentions();
          return mentions.map((m) => ({
            platformItemId: m.id,
            authorName: m.authorName,
            content: m.content,
            createdAt: m.timestamp,
          }));
        } catch (browserErr) {
          logger.error('inbox.x.mentions_browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      try {
        return await apiAdapter.fetchDMs(since);
      } catch (err) {
        logger.warn('inbox.x.dms_api_failed_using_browser', { error: String(err) });
        try {
          const dms = await scrapeXDMs();
          return dms.map((d) => ({
            platformItemId: (d as any).id || '',
            conversationId: (d as any).id || '',
            authorName: (d as any).author || '',
            content: (d as any).content || '',
            createdAt: (d as any).timestamp || new Date(),
          }));
        } catch (browserErr) {
          logger.error('inbox.x.dms_browser_fallback_failed', { error: String(browserErr) });
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
