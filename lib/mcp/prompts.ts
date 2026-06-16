import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { mcpContext } from './server';
import { prisma } from '@/lib/prisma';

const platformEnum = z.enum([
  'instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'pinterest',
]);

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'create-content-calendar',
    {
      title: 'Create Content Calendar',
      description: 'Generate a week of content across platforms with themed posts',
      argsSchema: {
        week_start: z.string().describe('Start date of the week (YYYY-MM-DD)'),
        platforms: z.array(platformEnum).describe('Target platforms'),
        theme: z.string().optional().describe('Content theme or focus area'),
      },
    },
    async (args) => {
      const ctx = mcpContext.getStore();
      let recentPosts = '';
      let brandInfo = '';
      if (ctx) {
        try {
          const posts = await prisma.post.findMany({
            where: { workspaceId: ctx.workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { content: true, status: true, createdAt: true },
          });
          recentPosts = posts.length > 0
            ? `\n\nRecent posts for reference:\n${JSON.stringify(posts.map(p => ({ text: typeof p.content === 'object' ? (p.content as any).text : p.content, status: p.status, date: p.createdAt })), null, 2)}`
            : '';
          const brand = await prisma.brandContext.findUnique({
            where: { workspaceId: ctx.workspaceId },
            select: { businessName: true, tonePreset: true, voiceDescription: true, goals: true },
          });
          if (brand) {
            brandInfo = `\n\nBrand: ${brand.businessName || 'Unknown'}, Tone: ${brand.tonePreset || 'N/A'}, Voice: ${brand.voiceDescription || 'N/A'}, Goals: ${brand.goals.join(', ') || 'N/A'}`;
          }
        } catch { /* use empty context */ }
      }
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Create a content calendar for the week starting ${args.week_start} across ${args.platforms.join(', ')}${args.theme ? ` with the theme: ${args.theme}` : ''}.${brandInfo}${recentPosts}\n\nInclude post ideas, suggested timing, and platform-specific variations.`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'analyze-engagement',
    {
      title: 'Analyze Engagement',
      description: 'Analyze recent engagement and suggest responses',
      argsSchema: {
        platform: z.string().optional().describe('Platform to analyze (omit for all)'),
        days: z.number().default(7).describe('Number of days to analyze'),
      },
    },
    async (args) => {
      const ctx = mcpContext.getStore();
      let engagementData = '';
      if (ctx) {
        try {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - args.days);
          const where: Record<string, unknown> = { workspaceId: ctx.workspaceId, createdAt: { gte: cutoff } };
          if (args.platform) where.platform = args.platform;
          const items = await prisma.engagementItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { type: true, platform: true, content: true, status: true, sentiment: true, createdAt: true },
          });
          if (items.length > 0) {
            engagementData = `\n\nRecent engagement data:\n${JSON.stringify(items, null, 2)}`;
          }
        } catch { /* use empty data */ }
      }
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze engagement from the last ${args.days} days${args.platform ? ` on ${args.platform}` : ' across all platforms'}.${engagementData}\n\nIdentify top-performing posts, engagement trends, and suggest responses to items that need attention.`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'brand-voice-audit',
    {
      title: 'Brand Voice Audit',
      description: 'Audit content consistency with brand voice',
      argsSchema: {
        platform: z.string().optional().describe('Platform to audit (omit for all)'),
      },
    },
    async (args) => {
      const ctx = mcpContext.getStore();
      let brandInfo = '';
      let recentContent = '';
      if (ctx) {
        try {
          const brand = await prisma.brandContext.findUnique({
            where: { workspaceId: ctx.workspaceId },
            select: { businessName: true, tonePreset: true, voiceDescription: true, bannedWords: true, goals: true },
          });
          if (brand) {
            brandInfo = `\n\nBrand guidelines:\nName: ${brand.businessName}\nTone: ${brand.tonePreset || 'N/A'}\nVoice: ${brand.voiceDescription || 'N/A'}\nBanned words: ${brand.bannedWords.join(', ') || 'None'}\nGoals: ${brand.goals.join(', ') || 'N/A'}`;
          }
          const where: Record<string, unknown> = { workspaceId: ctx.workspaceId };
          if (args.platform) where.PostPlatform = { some: { platform: args.platform } };
          const posts = await prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { content: true, status: true, createdAt: true, PostPlatform: { select: { platform: true, content: true } } },
          });
          if (posts.length > 0) {
            recentContent = `\n\nRecent content to audit:\n${JSON.stringify(posts.map(p => ({ text: typeof p.content === 'object' ? (p.content as any).text : p.content, platforms: p.PostPlatform.map(pp => pp.platform), status: p.status, date: p.createdAt })), null, 2)}`;
          }
        } catch { /* use empty data */ }
      }
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Audit recent content${args.platform ? ` on ${args.platform}` : ' across all platforms'} for brand voice consistency.${brandInfo}${recentContent}\n\nCheck tone, messaging, terminology, and style against the brand guidelines. Flag inconsistencies and suggest corrections.`,
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'trending-to-content',
    {
      title: 'Trending to Content',
      description: 'Turn trending topics into branded content',
      argsSchema: {
        topic: z.string().describe('The trending topic to create content for'),
        platforms: z.array(platformEnum).describe('Target platforms'),
      },
    },
    async (args) => {
      const ctx = mcpContext.getStore();
      let brandInfo = '';
      let trendingData = '';
      if (ctx) {
        try {
          const brand = await prisma.brandContext.findUnique({
            where: { workspaceId: ctx.workspaceId },
            select: { businessName: true, tonePreset: true, voiceDescription: true, audienceType: true, goals: true },
          });
          if (brand) {
            brandInfo = `\n\nBrand: ${brand.businessName}, Tone: ${brand.tonePreset || 'N/A'}, Voice: ${brand.voiceDescription || 'N/A'}, Audience: ${brand.audienceType || 'N/A'}, Goals: ${brand.goals.join(', ') || 'N/A'}`;
          }
          const trending = await prisma.redditTrendingPost.findMany({
            where: { workspaceId: ctx.workspaceId, dismissedAt: null },
            orderBy: { relevanceScore: 'desc' },
            take: 10,
            select: { title: true, subreddit: true, upvotes: true, topicTags: true },
          });
          if (trending.length > 0) {
            trendingData = `\n\nCurrent trending topics:\n${JSON.stringify(trending, null, 2)}`;
          }
        } catch { /* use empty data */ }
      }
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Create branded content for ${args.platforms.join(', ')} based on the trending topic: "${args.topic}".${brandInfo}${trendingData}\n\nAdapt the topic to fit the brand voice and audience. Include platform-specific formats and suggested posting times.`,
          },
        }],
      };
    },
  );
}
