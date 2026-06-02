import { logger } from '@/lib/logger';
import type { EngagementAdapter, RawComment, RawMention, RawDM } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';
import { createInstagramInboxAdapter } from './instagram';
import { scrapeInstagramPosts, scrapeInstagramComments } from '@/lib/cloakbrowser/platforms/instagram';

export function createInstagramHybridAdapter(igAccountId: string, encryptedToken: string): EngagementAdapter {
  const apiAdapter = createInstagramInboxAdapter(igAccountId, encryptedToken);

  return {
    platform: 'instagram' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      try {
        return await apiAdapter.fetchComments(since);
      } catch (err) {
        logger.warn('inbox.instagram.api_failed_using_browser', { error: String(err) });
        try {
          const posts = await scrapeInstagramPosts();
          const comments: RawComment[] = [];
          for (const post of posts.slice(0, 5)) {
            if (post.imageUrl) {
              const postComments = await scrapeInstagramComments(post.imageUrl);
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
          logger.error('inbox.instagram.browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      return apiAdapter.fetchMentions(since);
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      return apiAdapter.fetchDMs(since);
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return apiAdapter.replyToComment(platformItemId, text);
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      return apiAdapter.replyToDM(conversationId, text);
    },
  };
}
