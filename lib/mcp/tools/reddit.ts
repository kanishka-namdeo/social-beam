import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext, requirePremiumScope, premiumScopeError } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

export function registerRedditTools(server: McpServer, options?: { skipAiTools?: boolean }) {
  server.registerTool(
    'reddit_trending',
    {
      description: 'List trending Reddit posts from monitored subreddits, ranked by relevance score.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
        min_score: z.number().int().min(0).default(0).describe('Minimum upvote score filter'),
        subreddit: z.string().optional().describe('Filter by specific subreddit'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const where: Record<string, unknown> = {
          workspaceId: ctx.workspaceId,
          upvotes: { gte: args.min_score },
          dismissedAt: null,
        };
        if (args.subreddit) where.subreddit = args.subreddit;

        const posts = await prisma.redditTrendingPost.findMany({
          where,
          orderBy: { relevanceScore: 'desc' },
          take: args.limit,
        });
        await logToolCall(ctx, 'reddit_trending', args, true);
        return success({ posts });
      } catch (e) {
        await logToolCall(ctx, 'reddit_trending', args, false, String(e));
        return error('Failed to list trending posts', String(e));
      }
    }
  );

  if (!options?.skipAiTools) {
    server.registerTool(
      'reddit_analyze',
      {
        description: 'AI-analyze a trending Reddit post for brand relevance and content opportunities.',
        inputSchema: z.object({
          post_id: z.string().describe('The trending post ID to analyze'),
        }),
        annotations: { readOnlyHint: true },
      },
      async (args) => {
        const ctx = requireContext();
        if (!requirePremiumScope('reddit_analyze')) {
          return premiumScopeError();
        }
        try {
          const { createLLM } = await import('@/lib/ai/model');
          const { loadBrandContextForAI, formatBrandSystemPrompt } = await import('@/lib/ai/brand-context-loader');

          const trending = await prisma.redditTrendingPost.findFirst({
            where: { id: args.post_id, workspaceId: ctx.workspaceId },
          });
          if (!trending) return error('Trending post not found', 'Verify the post_id is correct');

          const brandCtx = await loadBrandContextForAI(ctx.workspaceId);
          const model = createLLM({ temperature: 0.4 });

          const systemPrompt = `You are a content strategist analyzing trending Reddit topics for brand relevance. ${brandCtx ? formatBrandSystemPrompt(brandCtx) : ''}\n\nAnalyze the provided Reddit post and return JSON with: { "relevanceScore": 0-10, "relevanceReason": string, "contentIdeas": string[], "suggestedPlatforms": string[], "riskLevel": "low"|"medium"|"high", "riskReason": string }`;

          const userPrompt = `Reddit post:\nTitle: ${trending.title}\nSubreddit: r/${trending.subreddit}\nUpvotes: ${trending.upvotes}\nComments: ${trending.commentCount}\nURL: ${trending.url}\nCurrent tags: ${trending.topicTags.join(', ')}`;

          const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ]);
          const analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          await prisma.redditTrendingPost.update({
            where: { id: trending.id },
            data: {
              relevanceScore: trending.relevanceScore,
              topicTags: trending.topicTags,
            },
          });

          await logToolCall(ctx, 'reddit_analyze', args, true);
          return success({ analysis, post: { id: trending.id, title: trending.title, subreddit: trending.subreddit } });
        } catch (e) {
          await logToolCall(ctx, 'reddit_analyze', args, false, String(e));
          return error('Failed to analyze trending post', String(e));
        }
      }
    );
  }

  server.registerTool(
    'reddit_subreddits_recommend',
    {
      description: 'Get recommended and configured subreddits for this workspace.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ctx = requireContext();
      try {
        const subreddits = await prisma.redditSubredditConfig.findMany({
          where: { workspaceId: ctx.workspaceId },
          orderBy: { relevanceScore: 'desc' },
        });
        await logToolCall(ctx, 'reddit_subreddits_recommend', {}, true);
        return success({ subreddits });
      } catch (e) {
        await logToolCall(ctx, 'reddit_subreddits_recommend', {}, false, String(e));
        return error('Failed to get subreddits', String(e));
      }
    }
  );

  server.registerTool(
    'reddit_create_post',
    {
      description: 'Create a new post inspired by a trending Reddit topic.',
      inputSchema: z.object({
        trending_post_id: z.string().describe('The trending Reddit post ID to base content on'),
        platforms: z.array(z.string()).describe('Target platforms for the new post'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const trending = await prisma.redditTrendingPost.findFirst({
          where: { id: args.trending_post_id, workspaceId: ctx.workspaceId },
        });
        if (!trending) return error('Trending post not found', 'Verify the trending_post_id is correct');

        const content = `[Inspired by r/${trending.subreddit}]\n\n${trending.title}\n\nSource: ${trending.url}`;

        const post = await prisma.post.create({
          data: {
            id: uuid(),
            workspaceId: ctx.workspaceId,
            content: { text: content, sourceTrendingPostId: trending.id },
            status: 'DRAFT',
            aiGenerated: true,
            PostPlatform: {
              create: args.platforms.map((platform) => ({
                id: uuid(),
                platform,
                content,
                status: 'DRAFT',
              })),
            },
          },
          include: { PostPlatform: true },
        });

        await prisma.redditTrendingPost.update({
          where: { id: trending.id },
          data: { actedOnAt: new Date(), postId: post.id },
        });

        await logToolCall(ctx, 'reddit_create_post', args, true);
        return success({ post, message: 'Draft post created from trending topic' });
      } catch (e) {
        await logToolCall(ctx, 'reddit_create_post', args, false, String(e));
        return error('Failed to create post from trending topic', String(e));
      }
    }
  );
}
