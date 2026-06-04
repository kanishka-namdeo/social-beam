import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const FetchPostsSchema = z.object({
  platform: z.string().describe('Platform name'),
  accountId: z.string().describe('Platform user/account ID'),
  limit: z.number().optional().describe('Number of posts to fetch (default 20)'),
});

export const fetchPostsTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { platform, accountId, limit = 20 } = FetchPostsSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'fetch_posts', platform, accountId });

    const platformEndpoints: Record<string, string> = {
      instagram: `https://graph.facebook.com/v22.0/${accountId}/media`,
      facebook: `https://graph.facebook.com/v22.0/${accountId}/posts`,
      x: `https://api.twitter.com/2/users/${accountId}/tweets`,
      linkedin: `https://api.linkedin.com/v2/ugcPosts`,
      tiktok: `https://open.tiktokapis.com/v2/post/list/`,
      pinterest: `https://api.pinterest.com/v5/boards/${accountId}/pins`,
    };

    const endpoint = platformEndpoints[platform.toLowerCase()];
    if (!endpoint) {
      logger.warn('tool.unsupported_platform', { toolName: 'fetch_posts', platform });
      return JSON.stringify({ error: `Unsupported platform: ${platform}` });
    }

    try {
      const params = new URLSearchParams({
        limit: String(limit),
      });

      if (platform.toLowerCase() === 'instagram') {
        params.set('fields', 'caption,media_type,media_url,timestamp,like_count,comments_count');
      }

      const response = await fetch(`${endpoint}?${params}`, {
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        logger.error('tool.error', { toolName: 'fetch_posts', platform, statusCode: response.status, error: (data.error as Record<string, unknown>)?.message });
        return JSON.stringify({ error: (data.error as Record<string, unknown>)?.message ?? 'Failed to fetch posts' });
      }

      const posts = (data.data as unknown[]) ?? [];
      logger.info('tool.complete', { toolName: 'fetch_posts', platform, postCount: posts.length, duration: Date.now() - start });
      return JSON.stringify({
        platform,
        count: posts.length,
        posts: posts.map((p) => {
          const post = p as Record<string, unknown>;
          return {
            id: post.id,
            caption: post.caption ?? post.message ?? '',
            mediaType: post.media_type ?? post.type ?? 'text',
            mediaUrl: post.media_url ?? post.full_picture ?? null,
            timestamp: post.timestamp ?? post.created_time ?? null,
            engagement: {
              likes: post.like_count ?? ((post.likes as Record<string, unknown>)?.count as number) ?? 0,
              comments: post.comments_count ?? ((post.comments as Record<string, unknown>)?.count as number) ?? 0,
            },
          };
        }),
      });
    } catch (error) {
      logger.error('tool.error', { toolName: 'fetch_posts', platform, error: String(error) });
      return JSON.stringify({ error: `Failed to fetch posts: ${error}` });
    }
  },
  {
    name: 'fetch_posts',
    description: 'Fetch recent posts from a connected social media account for profile analysis.',
    schema: FetchPostsSchema,
  }
);
