import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';

export function registerPublishTools(server: McpServer) {
  server.registerTool(
    'publish_now',
    {
      description: 'Immediately publish a draft post. Sets status to PUBLISHING — actual platform publishing is handled by a background job.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID to publish'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const post = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
        });
        if (!post) return error('Post not found', 'Verify the post_id is correct');
        if (post.status !== 'DRAFT') {
          return error('Only DRAFT posts can be published', `Current status: ${post.status}`);
        }

        const updated = await prisma.post.update({
          where: { id: args.post_id },
          data: { status: 'PUBLISHING' },
          include: { PostPlatform: true },
        });
        await logToolCall(ctx, 'publish_now', args, true);
        return success({ post: updated, message: 'Post queued for publishing' });
      } catch (e) {
        await logToolCall(ctx, 'publish_now', args, false, String(e));
        return error('Failed to publish post', String(e));
      }
    }
  );

  server.registerTool(
    'publish_schedule',
    {
      description: 'Schedule a draft post for future publishing.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID to schedule'),
        scheduled_at: z.string().datetime().describe('ISO datetime for when to publish'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const post = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
        });
        if (!post) return error('Post not found', 'Verify the post_id is correct');
        if (post.status !== 'DRAFT') {
          return error('Only DRAFT posts can be scheduled', `Current status: ${post.status}`);
        }

        const updated = await prisma.post.update({
          where: { id: args.post_id },
          data: {
            scheduledAt: new Date(args.scheduled_at),
            status: 'SCHEDULED',
          },
          include: { PostPlatform: true },
        });
        await logToolCall(ctx, 'publish_schedule', args, true);
        return success({ post: updated, message: `Post scheduled for ${args.scheduled_at}` });
      } catch (e) {
        await logToolCall(ctx, 'publish_schedule', args, false, String(e));
        return error('Failed to schedule post', String(e));
      }
    }
  );

  server.registerTool(
    'publish_retry',
    {
      description: 'Retry publishing a failed post by resetting specified platform entries back to DRAFT.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID to retry'),
        platforms: z.array(z.string()).describe('Platforms to retry publishing on'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const post = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
        });
        if (!post) return error('Post not found', 'Verify the post_id is correct');

        const result = await prisma.postPlatform.updateMany({
          where: {
            postId: args.post_id,
            platform: { in: args.platforms },
          },
          data: { status: 'DRAFT', error: null },
        });

        if (result.count === 0) {
          return error('No matching platform entries found', 'Verify the platforms are correct');
        }

        await prisma.post.update({
          where: { id: args.post_id },
          data: { status: 'DRAFT' },
        });

        await logToolCall(ctx, 'publish_retry', args, true);
        return success({
          message: `Reset ${result.count} platform entries for retry`,
          platforms: args.platforms,
        });
      } catch (e) {
        await logToolCall(ctx, 'publish_retry', args, false, String(e));
        return error('Failed to retry publish', String(e));
      }
    }
  );

  server.registerTool(
    'publish_status',
    {
      description: 'Get publish status for a post including per-platform results.',
      inputSchema: z.object({
        post_id: z.string().describe('The post ID to check'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const post = await prisma.post.findFirst({
          where: { id: args.post_id, workspaceId: ctx.workspaceId },
          include: { PostPlatform: true },
        });
        if (!post) return error('Post not found', 'Verify the post_id is correct');

        await logToolCall(ctx, 'publish_status', args, true);
        return success({
          post: {
            id: post.id,
            status: post.status,
            scheduledAt: post.scheduledAt,
            publishedAt: post.publishedAt,
          },
          platforms: post.PostPlatform.map((pp) => ({
            platform: pp.platform,
            status: pp.status,
            postUrl: pp.postUrl,
            error: pp.error,
            createdAt: pp.createdAt,
          })),
        });
      } catch (e) {
        await logToolCall(ctx, 'publish_status', args, false, String(e));
        return error('Failed to get publish status', String(e));
      }
    }
  );
}
