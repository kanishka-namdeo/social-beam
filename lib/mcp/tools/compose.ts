import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext, requirePremiumScope, premiumScopeError } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

const PLATFORM_ENUM = z.enum([
  'instagram', 'facebook', 'x', 'linkedin',
  'tiktok', 'pinterest', 'threads', 'bluesky',
  'google_business', 'youtube',
]);

const POST_STATUS_ENUM = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']);

export function registerComposeTools(server: McpServer, options?: { skipAiTools?: boolean }) {
  server.registerTool(
    'compose_create_post',
    {
      description: 'Create a new social media post (draft, scheduled, or publish immediately). Use when the user wants to create content for social platforms.',
      inputSchema: z.object({
        content: z.string().describe('The post content text'),
        platforms: z.array(PLATFORM_ENUM).describe('Target platforms'),
        status: z.enum(['draft', 'scheduled', 'publish_now']).default('draft').describe('Post action'),
        scheduled_at: z.string().datetime().optional().describe('ISO datetime for scheduled posts'),
        media_ids: z.array(z.string()).optional().describe('Media asset IDs to attach'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const postStatus = args.status === 'publish_now' ? 'PUBLISHING' : args.status === 'scheduled' ? 'SCHEDULED' : 'DRAFT';
        const post = await prisma.post.create({
          data: {
            id: uuid(),
            workspaceId: ctx.workspaceId,
            content: { text: args.content, mediaIds: args.media_ids || [] },
            status: postStatus,
            aiGenerated: true,
            scheduledAt: args.scheduled_at ? new Date(args.scheduled_at) : null,
            PostPlatform: {
              create: args.platforms.map((platform) => ({
                id: uuid(),
                platform,
                content: args.content,
                status: postStatus,
              })),
            },
          },
          include: { PostPlatform: true },
        });
        await logToolCall(ctx, 'compose_create_post', args, true);
        return success({ post, message: `Post created with status ${postStatus}` });
      } catch (e) {
        await logToolCall(ctx, 'compose_create_post', args, false, String(e));
        return error('Failed to create post', String(e));
      }
    }
  );

  if (!options?.skipAiTools) {
    server.registerTool(
      'compose_generate',
      {
        description: 'AI-generate post content based on a prompt, personalized with brand context.',
        inputSchema: z.object({
          prompt: z.string().describe('Description of what to generate'),
          platforms: z.array(PLATFORM_ENUM).describe('Target platforms'),
          tone: z.string().optional().describe('Desired tone (e.g., professional, casual, humorous)'),
        }),
      },
      async (args) => {
        const ctx = requireContext();
        if (!requirePremiumScope('compose_generate')) {
          return premiumScopeError();
        }
        try {
          const { loadBrandContextForAI } = await import('@/lib/ai/brand-context-loader');
          const { buildComposePrompts } = await import('@/lib/ai/compose-prompt-builder');
          const { createLLM } = await import('@/lib/ai/model');

          const brandCtx = await loadBrandContextForAI(ctx.workspaceId);
          const model = createLLM({ temperature: 0.8 });
          const prompts = buildComposePrompts(args.prompt, brandCtx, args.platforms);

          const results: Record<string, string> = {};
          for (const p of prompts) {
            const response = await model.invoke([
              { role: 'system', content: p.systemPrompt },
              { role: 'user', content: p.userPrompt },
            ]);
            results[p.platform] = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
          }

          await logToolCall(ctx, 'compose_generate', args, true);
          return success({ generatedContent: results, platforms: args.platforms, message: 'Content generated successfully' });
        } catch (e) {
          await logToolCall(ctx, 'compose_generate', args, false, String(e));
          return error('Failed to generate content', String(e));
        }
      }
    );
  }

  server.registerTool(
    'compose_list_posts',
    {
      description: 'List posts with optional filters for status and platform.',
      inputSchema: z.object({
        status: POST_STATUS_ENUM.optional().describe('Filter by post status'),
        platform: z.string().optional().describe('Filter by platform'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
        offset: z.number().int().min(0).default(0).describe('Offset for pagination'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const where: Record<string, unknown> = { workspaceId: ctx.workspaceId };
        if (args.status) where.status = args.status;
        if (args.platform) {
          where.PostPlatform = { some: { platform: args.platform } };
        }
        const [posts, total] = await Promise.all([
          prisma.post.findMany({
            where,
            include: { PostPlatform: true },
            orderBy: { createdAt: 'desc' },
            take: args.limit,
            skip: args.offset,
          }),
          prisma.post.count({ where }),
        ]);
        await logToolCall(ctx, 'compose_list_posts', args, true);
        return success({ posts, total, limit: args.limit, offset: args.offset });
      } catch (e) {
        await logToolCall(ctx, 'compose_list_posts', args, false, String(e));
        return error('Failed to list posts', String(e));
      }
    }
  );

  server.registerTool(
    'compose_get_post',
    {
      description: 'Get a specific post by ID with full details including platform-specific content and analytics.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const post = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
          include: { PostPlatform: true, AnalyticsSnapshot: true },
        });
        if (!post) return error('Post not found', 'Verify the post_id is correct');
        await logToolCall(ctx, 'compose_get_post', args, true);
        return success({ post });
      } catch (e) {
        await logToolCall(ctx, 'compose_get_post', args, false, String(e));
        return error('Failed to get post', String(e));
      }
    }
  );

  server.registerTool(
    'compose_update_post',
    {
      description: 'Update a draft or scheduled post. Only DRAFT and SCHEDULED posts can be updated.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID'),
        content: z.string().optional().describe('New post content text'),
        scheduled_at: z.string().datetime().optional().describe('New scheduled datetime'),
        status: z.enum(['draft', 'scheduled']).optional().describe('New status'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const existing = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
        });
        if (!existing) return error('Post not found', 'Verify the post_id is correct');
        if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
          return error('Only DRAFT or SCHEDULED posts can be updated', `Current status: ${existing.status}`);
        }
        const updateData: Record<string, unknown> = {};
        if (args.content) {
          updateData.content = { text: args.content };
          await prisma.postPlatform.updateMany({
            where: { postId: args.post_id },
            data: { content: args.content },
          });
        }
        if (args.scheduled_at) updateData.scheduledAt = new Date(args.scheduled_at);
        if (args.status) {
          updateData.status = args.status === 'scheduled' ? 'SCHEDULED' : 'DRAFT';
        }
        const post = await prisma.post.update({
          where: { id: args.post_id },
          data: updateData,
          include: { PostPlatform: true },
        });
        await logToolCall(ctx, 'compose_update_post', args, true);
        return success({ post, message: 'Post updated successfully' });
      } catch (e) {
        await logToolCall(ctx, 'compose_update_post', args, false, String(e));
        return error('Failed to update post', String(e));
      }
    }
  );

  server.registerTool(
    'compose_delete_post',
    {
      description: 'Delete a draft post. Only DRAFT posts can be deleted.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID to delete'),
      }),
      annotations: { destructiveHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const existing = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
        });
        if (!existing) return error('Post not found', 'Verify the post_id is correct');
        if (existing.status !== 'DRAFT') {
          return error('Only DRAFT posts can be deleted', `Current status: ${existing.status}`);
        }
        await prisma.post.delete({ where: { id: args.post_id } });
        await logToolCall(ctx, 'compose_delete_post', args, true);
        return success({ message: 'Post deleted successfully' });
      } catch (e) {
        await logToolCall(ctx, 'compose_delete_post', args, false, String(e));
        return error('Failed to delete post', String(e));
      }
    }
  );
}
