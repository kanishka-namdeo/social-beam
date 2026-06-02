import { logger } from '@/lib/logger';
import { decryptToken } from '@/lib/oauth/crypto';
import type { EngagementAdapter, RawComment, RawDM, RawMention } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';

const FB_BASE_URL = 'https://graph.facebook.com/v22.0';

async function apiGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${FB_BASE_URL}${path}`);
  url.searchParams.set('access_token', accessToken);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message = (data.error as Record<string, unknown>)?.message ?? JSON.stringify(data);
    throw new Error(`Facebook API error (${res.status}): ${message}`);
  }

  return data as T;
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const url = `${FB_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message = (data.error as Record<string, unknown>)?.message ?? JSON.stringify(data);
    throw new Error(`Facebook API error (${res.status}): ${message}`);
  }

  return data as T;
}

export function createFacebookInboxAdapter(fbPageId: string, encryptedToken: string): EngagementAdapter {
  return {
    platform: 'facebook' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      const token = decryptToken(encryptedToken);
      const comments: RawComment[] = [];

      try {
        const posts = await apiGet<{ data: Array<{ id: string; message?: string }> }>(
          `/${fbPageId}/posts`,
          token,
          { fields: 'id,message', limit: '25' },
        );

        for (const post of posts.data) {
          try {
            const postComments = await apiGet<{ data: Array<Record<string, unknown>> }>(
              `/${post.id}/comments`,
              token,
              { fields: 'id,message,from{name,profile_pic},created_time,can_comment', limit: '50' },
            );

            for (const c of postComments.data) {
              if (since && new Date(c.created_time as string) <= since) continue;
              comments.push({
                platformItemId: c.id as string,
                authorName: ((c.from as Record<string, unknown>)?.name as string) ?? 'Unknown',
                content: (c.message as string) ?? '',
                parentContent: post.message,
                platformUrl: `https://facebook.com/${fbPageId}/posts/${post.id}`,
                createdAt: new Date(c.created_time as string),
              });
            }
          } catch (err) {
            logger.warn('inbox.facebook.comments_fetch_failed', { postId: post.id, error: String(err) });
          }
        }
      } catch (err) {
        logger.warn('inbox.facebook.posts_fetch_failed', { error: String(err) });
      }

      return comments;
    },

    async fetchMentions(): Promise<RawMention[]> {
      // Facebook mentions are indirect — no dedicated mentions API for Pages
      return [];
    },

    async fetchDMs(): Promise<RawDM[]> {
      const token = decryptToken(encryptedToken);
      const dms: RawDM[] = [];

      try {
        const conversations = await apiGet<{ data: Array<Record<string, unknown>> }>(
          `/${fbPageId}/conversations`,
          token,
          { fields: 'id,updated_time,snippet,participants{name,profile_pic}', limit: '25' },
        );

        for (const conv of conversations.data) {
          dms.push({
            platformItemId: conv.id as string,
            conversationId: conv.id as string,
            authorName: 'Messenger',
            content: (conv.snippet as string) ?? '',
            createdAt: new Date(conv.updated_time as string),
          });
        }
      } catch (err) {
        logger.warn('inbox.facebook.dms_fetch_failed', { error: String(err) });
      }

      return dms;
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          `/${platformItemId}/comments`,
          { message: text },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.facebook.reply_failed', { platformItemId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          `/${conversationId}/messages`,
          { message: { text } },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.facebook.dm_reply_failed', { conversationId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },
  };
}
