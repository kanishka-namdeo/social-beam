import { logger } from '@/lib/logger';
import { decryptToken } from '@/lib/oauth/crypto';
import type { EngagementAdapter, RawComment, RawDM, RawMention } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';

const INSTAGRAM_BASE_URL = 'https://graph.facebook.com/v22.0';

async function apiGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${INSTAGRAM_BASE_URL}${path}`);
  url.searchParams.set('access_token', accessToken);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message = (data.error as Record<string, unknown>)?.message ?? JSON.stringify(data);
    throw new Error(`Instagram API error (${res.status}): ${message}`);
  }

  return data as T;
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const url = `${INSTAGRAM_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message = (data.error as Record<string, unknown>)?.message ?? JSON.stringify(data);
    throw new Error(`Instagram API error (${res.status}): ${message}`);
  }

  return data as T;
}

export function createInstagramInboxAdapter(igAccountId: string, encryptedToken: string): EngagementAdapter {
  return {
    platform: 'instagram' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      const token = decryptToken(encryptedToken);
      const comments: RawComment[] = [];
      let nextUrl: string | null = `/${igAccountId}/media`;

      while (nextUrl) {
        const data = await apiGet<{ data: Array<{ id: string }> }>(nextUrl, token, {
          fields: 'id,caption,media_type,permalink,timestamp',
          limit: '25',
        });

        for (const media of data.data) {
          try {
            const mediaComments = await apiGet<{ data: Array<Record<string, unknown>> }>(
              `/${media.id}/comments`,
              token,
              { fields: 'id,text,username,timestamp,hidden', limit: '50' },
            );

            for (const c of mediaComments.data) {
              if (since && new Date(c.timestamp as string) <= since) continue;
              comments.push({
                platformItemId: c.id as string,
                authorName: (c.username as string) ?? 'Unknown',
                content: (c.text as string) ?? '',
                platformUrl: `https://instagram.com/p/${media.id}`,
                createdAt: new Date(c.timestamp as string),
              });
            }
          } catch (err) {
            logger.warn('inbox.instagram.comments_fetch_failed', { mediaId: media.id, error: String(err) });
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextUrl = (data as any).paging?.next ? null : null;
        break; // Cursor-based pagination not implemented for MVP
      }

      return comments;
    },

    async fetchMentions(): Promise<RawMention[]> {
      const token = decryptToken(encryptedToken);
      const mentions: RawMention[] = [];

      try {
        const data = await apiGet<{ data: Array<Record<string, unknown>> }>(
          `/${igAccountId}/mentioned_comment`,
          token,
          { fields: 'id,text,username,timestamp,media{id,caption}', limit: '25' },
        );

        for (const m of data.data) {
          mentions.push({
            platformItemId: m.id as string,
            authorName: (m.username as string) ?? 'Unknown',
            content: (m.text as string) ?? '',
            createdAt: new Date(m.timestamp as string),
          });
        }
      } catch (err) {
        logger.warn('inbox.instagram.mentions_fetch_failed', { error: String(err) });
      }

      return mentions;
    },

    async fetchDMs(): Promise<RawDM[]> {
      const token = decryptToken(encryptedToken);
      const dms: RawDM[] = [];

      try {
        const data = await apiGet<{ data: Array<Record<string, unknown>> }>(
          `/${igAccountId}/conversations`,
          token,
          { fields: 'id,updated_time,snippet,participants{id,name,profile_pic}', limit: '25' },
        );

        for (const conv of data.data) {
          dms.push({
            platformItemId: conv.id as string,
            conversationId: conv.id as string,
            authorName: 'DM',
            content: (conv.snippet as string) ?? '',
            createdAt: new Date(conv.updated_time as string),
            expiresAt: new Date(new Date(conv.updated_time as string).getTime() + 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        logger.warn('inbox.instagram.dms_fetch_failed', { error: String(err) });
      }

      return dms;
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          `/${platformItemId}/replies`,
          { message: text },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.instagram.reply_failed', { platformItemId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          `/${igAccountId}/messages`,
          { recipient: { id: conversationId }, message: { text } },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.instagram.dm_reply_failed', { conversationId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },
  };
}
