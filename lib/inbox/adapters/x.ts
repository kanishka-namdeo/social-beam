import { logger } from '@/lib/logger';
import { decryptToken } from '@/lib/oauth/crypto';
import type { EngagementAdapter, RawComment, RawDM, RawMention } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';

const X_API_BASE = 'https://api.twitter.com/2';

async function apiGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${X_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const errors = data.errors as unknown[] | undefined;
    const firstError = errors?.[0] as Record<string, unknown> | undefined;
    const message = (firstError?.detail as string) ?? JSON.stringify(data);
    throw new Error(`X API error (${res.status}): ${message}`);
  }

  return data as T;
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${X_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok && res.status !== 201) {
    const errors = data.errors as unknown[] | undefined;
    const firstError = errors?.[0] as Record<string, unknown> | undefined;
    const message = (firstError?.detail as string) ?? JSON.stringify(data);
    throw new Error(`X API error (${res.status}): ${message}`);
  }

  return data as T;
}

export function createXInboxAdapter(encryptedToken: string): EngagementAdapter {
  return {
    platform: 'x' as PlatformName,

    async fetchComments(since?: Date): Promise<RawComment[]> {
      const token = decryptToken(encryptedToken);
      const comments: RawComment[] = [];

      try {
        // Search for replies to user's tweets via conversation_id
        const data = await apiGet<{ data: Array<Record<string, unknown>> }>(
          '/tweets/search/recent',
          token,
          {
            query: `is:reply`,
            'tweet.fields': 'created_at,author_id,conversation_id,in_reply_to_user_id,public_metrics',
            'user.fields': 'name,profile_image_url,username',
            expansions: 'author_id',
            max_results: '50',
          },
        );

        if (data.data) {
          for (const tweet of data.data) {
            if (since && new Date(tweet.created_at as string) <= since) continue;
            const authorId = tweet.author_id as string;
            comments.push({
              platformItemId: tweet.id as string,
              authorName: (tweet.author_id as string) ?? 'Unknown',
              content: (tweet.text as string) ?? '',
              platformUrl: `https://x.com/i/status/${tweet.id}`,
              createdAt: new Date(tweet.created_at as string),
            });
          }
        }
      } catch (err) {
        logger.warn('inbox.x.comments_fetch_failed', { error: String(err) });
      }

      return comments;
    },

    async fetchMentions(since?: Date): Promise<RawMention[]> {
      const token = decryptToken(encryptedToken);
      const mentions: RawMention[] = [];

      try {
        // Get authenticated user's mentions
        const me = await apiGet<{ data: { id: string } }>('/users/me', token);
        const data = await apiGet<{ data: Array<Record<string, unknown>> }>(
          `/users/${me.data.id}/mentions`,
          token,
          {
            'tweet.fields': 'created_at,author_id,public_metrics',
            'user.fields': 'name,profile_image_url,username',
            expansions: 'author_id',
            max_results: '50',
          },
        );

        if (data.data) {
          for (const tweet of data.data) {
            if (since && new Date(tweet.created_at as string) <= since) continue;
            mentions.push({
              platformItemId: tweet.id as string,
              authorName: (tweet.author_id as string) ?? 'Unknown',
              content: (tweet.text as string) ?? '',
              platformUrl: `https://x.com/i/status/${tweet.id}`,
              createdAt: new Date(tweet.created_at as string),
            });
          }
        }
      } catch (err) {
        logger.warn('inbox.x.mentions_fetch_failed', { error: String(err) });
      }

      return mentions;
    },

    async fetchDMs(since?: Date): Promise<RawDM[]> {
      const token = decryptToken(encryptedToken);
      const dms: RawDM[] = [];

      try {
        const me = await apiGet<{ data: { id: string } }>('/users/me', token);
        const data = await apiGet<{ data: Array<Record<string, unknown>> }>(
          '/dm_events',
          token,
          {
            'dm_event.fields': 'id,text,created_at,sender_id',
            max_results: '50',
          },
        );

        if (data.data) {
          for (const dm of data.data) {
            if (since && new Date(dm.created_at as string) <= since) continue;
            dms.push({
              platformItemId: dm.id as string,
              conversationId: dm.id as string,
              authorName: (dm.sender_id as string) ?? 'Unknown',
              content: (dm.text as string) ?? '',
              createdAt: new Date(dm.created_at as string),
            });
          }
        }
      } catch (err) {
        logger.warn('inbox.x.dms_fetch_failed', { error: String(err) });
      }

      return dms;
    },

    async replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          '/tweets',
          {
            text: text,
            reply: { in_reply_to_tweet_id: platformItemId },
          },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.x.reply_failed', { platformItemId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },

    async replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }> {
      try {
        const token = decryptToken(encryptedToken);
        await apiPost<Record<string, unknown>>(
          `/dm_conversations/with/${conversationId}/messages`,
          { text },
          token,
        );
        return { success: true };
      } catch (err) {
        logger.error('inbox.x.dm_reply_failed', { conversationId, error: String(err) });
        return { success: false, error: String(err) };
      }
    },
  };
}
