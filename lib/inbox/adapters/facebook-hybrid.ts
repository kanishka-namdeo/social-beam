import { logger } from '@/lib/logger';
import type { EngagementAdapter, RawComment, RawMention, RawDM } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';
import { createFacebookInboxAdapter } from './facebook';
import { scrapeFacebookPosts, scrapeFacebookComments, scrapeFacebookMentions } from '@/lib/cloakbrowser/platforms/facebook';

export function createFacebookHybridAdapter(platformUserId: string, encryptedToken: string): EngagementAdapter {
  const apiAdapter = createFacebookInboxAdapter(platformUserId, encryptedToken);

  return {
    platform: 'facebook' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      try {
        return await apiAdapter.fetchComments(since);
      } catch (err) {
        logger.warn('inbox.facebook.api_failed_using_browser', { error: String(err) });
        try {
          const posts = await scrapeFacebookPosts();
          const comments: RawComment[] = [];
          for (const post of posts.slice(0, 5)) {
            const postComments = await scrapeFacebookComments(`https://www.facebook.com/${post.id}`);
            comments.push(...postComments.map((c) => ({
              platformItemId: post.id,
              authorName: c.authorName,
              content: c.content,
              createdAt: c.timestamp,
            })));
          }
          return comments;
        } catch (browserErr) {
          logger.error('inbox.facebook.browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      try {
        return await apiAdapter.fetchMentions(since);
      } catch (err) {
        logger.warn('inbox.facebook.mentions_api_failed_using_browser', { error: String(err) });
        try {
          const mentions = await scrapeFacebookMentions();
          return mentions.map((m) => ({
            platformItemId: m.id,
            authorName: m.authorName,
            content: m.content,
            createdAt: m.timestamp,
          }));
        } catch (browserErr) {
          logger.error('inbox.facebook.mentions_browser_fallback_failed', { error: String(browserErr) });
          return [];
        }
      }
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
