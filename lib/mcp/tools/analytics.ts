import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext, requirePremiumScope, premiumScopeError } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';

export function registerAnalyticsTools(server: McpServer, options?: { skipAiTools?: boolean }) {
  server.registerTool(
    'analytics_overview',
    {
      description: 'Get aggregated analytics metrics over a time period. Returns totals for likes, comments, shares, impressions, reach, and clicks.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(365).default(30).describe('Number of days to look back'),
        platform: z.string().optional().describe('Filter by specific platform'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - args.days);

        const where: Record<string, unknown> = {
          Post: { workspaceId: ctx.workspaceId },
          snapshotAt: { gte: startDate },
        };
        if (args.platform) where.platform = args.platform;

        const snapshots = await prisma.analyticsSnapshot.findMany({
          where,
          select: {
            likes: true,
            comments: true,
            shares: true,
            impressions: true,
            reach: true,
            clicks: true,
            engagementRate: true,
            snapshotAt: true,
            platform: true,
          },
        });

        const totals = snapshots.reduce(
          (acc, s) => ({
            likes: acc.likes + s.likes,
            comments: acc.comments + s.comments,
            shares: acc.shares + s.shares,
            impressions: acc.impressions + s.impressions,
            reach: acc.reach + s.reach,
            clicks: acc.clicks + s.clicks,
          }),
          { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, clicks: 0 }
        );

        const avgEngagement = snapshots.length
          ? snapshots.reduce((sum, s) => sum + (s.engagementRate || 0), 0) / snapshots.length
          : 0;

        await logToolCall(ctx, 'analytics_overview', args, true);
        return success({
          period: { days: args.days, startDate: startDate.toISOString() },
          platform: args.platform || 'all',
          totals,
          averageEngagementRate: Math.round(avgEngagement * 10000) / 100,
          snapshotCount: snapshots.length,
        });
      } catch (e) {
        await logToolCall(ctx, 'analytics_overview', args, false, String(e));
        return error('Failed to get analytics overview', String(e));
      }
    }
  );

  server.registerTool(
    'analytics_content_ranking',
    {
      description: 'Get top performing posts ranked by a specific metric.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10).describe('Number of posts to return'),
        platform: z.string().optional().describe('Filter by platform'),
        metric: z.enum(['likes', 'comments', 'shares', 'impressions', 'engagementRate']).default('engagementRate').describe('Metric to rank by'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const posts = await prisma.post.findMany({
          where: { workspaceId: ctx.workspaceId },
          include: {
            AnalyticsSnapshot: args.platform ? { where: { platform: args.platform } } : true,
            PostPlatform: args.platform ? { where: { platform: args.platform } } : true,
          },
          orderBy: { createdAt: 'desc' },
        });

        const ranked = posts
          .filter((p) => p.AnalyticsSnapshot.length > 0)
          .map((p) => {
            const latest = p.AnalyticsSnapshot.sort(
              (a, b) => b.snapshotAt.getTime() - a.snapshotAt.getTime()
            )[0];
            return {
              postId: p.id,
              status: p.status,
              createdAt: p.createdAt,
              platforms: p.PostPlatform.map((pp) => pp.platform),
              metrics: {
                likes: latest.likes,
                comments: latest.comments,
                shares: latest.shares,
                impressions: latest.impressions,
                engagementRate: latest.engagementRate,
              },
            };
          })
          .sort((a, b) => {
            const aVal = args.metric === 'engagementRate'
              ? (a.metrics.engagementRate || 0)
              : (a.metrics as Record<string, number>)[args.metric];
            const bVal = args.metric === 'engagementRate'
              ? (b.metrics.engagementRate || 0)
              : (b.metrics as Record<string, number>)[args.metric];
            return bVal - aVal;
          })
          .slice(0, args.limit);

        await logToolCall(ctx, 'analytics_content_ranking', args, true);
        return success({ ranking: ranked, metric: args.metric, platform: args.platform || 'all' });
      } catch (e) {
        await logToolCall(ctx, 'analytics_content_ranking', args, false, String(e));
        return error('Failed to get content ranking', String(e));
      }
    }
  );

  server.registerTool(
    'analytics_audience_growth',
    {
      description: 'Get follower growth time-series data over a period.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(365).default(30).describe('Number of days to look back'),
        platform: z.string().optional().describe('Filter by specific platform'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - args.days);

        const where: Record<string, unknown> = {
          workspaceId: ctx.workspaceId,
          snapshotAt: { gte: startDate },
        };
        if (args.platform) where.platform = args.platform;

        const snapshots = await prisma.followerSnapshot.findMany({
          where,
          orderBy: { snapshotAt: 'asc' },
        });

        const byPlatform: Record<string, { followers: number; following: number; date: string }[]> = {};
        for (const s of snapshots) {
          if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
          byPlatform[s.platform].push({
            followers: s.followers,
            following: s.following,
            date: s.snapshotAt.toISOString(),
          });
        }

        await logToolCall(ctx, 'analytics_audience_growth', args, true);
        return success({
          period: { days: args.days, startDate: startDate.toISOString() },
          platform: args.platform || 'all',
          data: byPlatform,
        });
      } catch (e) {
        await logToolCall(ctx, 'analytics_audience_growth', args, false, String(e));
        return error('Failed to get audience growth', String(e));
      }
    }
  );

  if (!options?.skipAiTools) {
    server.registerTool(
      'analytics_recommendations',
      {
        description: 'Get AI-powered posting recommendations based on analytics data.',
        inputSchema: z.object({
          platform: z.string().optional().describe('Filter by platform'),
          days: z.number().int().min(1).max(365).default(30).describe('Days of data to analyze'),
        }),
        annotations: { readOnlyHint: true },
      },
      async (args) => {
        const ctx = requireContext();
        if (!requirePremiumScope('analytics_recommendations')) {
          return premiumScopeError();
        }
        try {
          const { createLLM } = await import('@/lib/ai/model');
          const { loadBrandContextForAI } = await import('@/lib/ai/brand-context-loader');

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - args.days);
          const where: Record<string, unknown> = {
            Post: { workspaceId: ctx.workspaceId },
            snapshotAt: { gte: startDate },
          };
          if (args.platform) where.platform = args.platform;

          const snapshots = await prisma.analyticsSnapshot.findMany({ where, take: 100, orderBy: { snapshotAt: 'desc' } });
          const brandCtx = await loadBrandContextForAI(ctx.workspaceId);
          const model = createLLM({ temperature: 0.4 });

          const systemPrompt = 'You are a social media analytics expert. Analyze the provided data and return actionable recommendations as JSON with this structure: { "insights": string[], "recommendations": { "action": string, "rationale": string, "priority": "high"|"medium"|"low" }[] }';
          const userPrompt = `Analytics data (${snapshots.length} snapshots, ${args.platform || 'all platforms'}):\n${JSON.stringify(snapshots.slice(0, 50))}\n\nBrand context: ${JSON.stringify(brandCtx)}`;

          const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ]);
          const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          await logToolCall(ctx, 'analytics_recommendations', args, true);
          return success({ recommendations: content, snapshotCount: snapshots.length, period: { days: args.days } });
        } catch (e) {
          await logToolCall(ctx, 'analytics_recommendations', args, false, String(e));
          return error('Failed to generate recommendations', String(e));
        }
      }
    );
  }
}
