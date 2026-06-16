import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext, requirePremiumScope, premiumScopeError } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';

const ENGAGEMENT_STATUS_ENUM = z.enum(['UNREAD', 'READ', 'REPLIED', 'DISMISSED']);

export function registerInboxTools(server: McpServer, options?: { skipAiTools?: boolean }) {
  server.registerTool(
    'inbox_list',
    {
      description: 'List engagement items (comments, mentions, DMs) with optional filters and cursor-based pagination.',
      inputSchema: z.object({
        status: ENGAGEMENT_STATUS_ENUM.optional().describe('Filter by status'),
        platform: z.string().optional().describe('Filter by platform'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
        cursor: z.string().datetime().optional().describe('Cursor for pagination (ISO datetime — returns items before this time)'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const where: Record<string, unknown> = { workspaceId: ctx.workspaceId };
        if (args.status) where.status = args.status;
        if (args.platform) where.platform = args.platform;
        if (args.cursor) where.createdAt = { lt: new Date(args.cursor) };

        const items = await prisma.engagementItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: args.limit,
        });

        const nextCursor = items.length === args.limit
          ? items[items.length - 1].createdAt.toISOString()
          : null;

        await logToolCall(ctx, 'inbox_list', args, true);
        return success({ items, nextCursor, hasMore: items.length === args.limit });
      } catch (e) {
        await logToolCall(ctx, 'inbox_list', args, false, String(e));
        return error('Failed to list inbox items', String(e));
      }
    }
  );

  server.registerTool(
    'inbox_get',
    {
      description: 'Get a specific engagement item by ID.',
      inputSchema: z.object({
        item_id: z.string().describe('The engagement item ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const item = await prisma.engagementItem.findFirst({
          where: { id: args.item_id, workspaceId: ctx.workspaceId },
        });
        if (!item) return error('Engagement item not found', 'Verify the item_id is correct');
        await logToolCall(ctx, 'inbox_get', args, true);
        return success({ item });
      } catch (e) {
        await logToolCall(ctx, 'inbox_get', args, false, String(e));
        return error('Failed to get engagement item', String(e));
      }
    }
  );

  server.registerTool(
    'inbox_reply',
    {
      description: 'Reply to an engagement item. Updates status to REPLIED and records the reply timestamp.',
      inputSchema: z.object({
        item_id: z.string().describe('The engagement item ID to reply to'),
        content: z.string().describe('The reply content'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const item = await prisma.engagementItem.findFirst({
          where: { id: args.item_id, workspaceId: ctx.workspaceId },
        });
        if (!item) return error('Engagement item not found', 'Verify the item_id is correct');

        const updated = await prisma.engagementItem.update({
          where: { id: args.item_id },
          data: {
            status: 'REPLIED',
            repliedAt: new Date(),
            aiDraft: args.content,
          },
        });
        await logToolCall(ctx, 'inbox_reply', args, true);
        return success({ item: updated, message: 'Reply recorded successfully' });
      } catch (e) {
        await logToolCall(ctx, 'inbox_reply', args, false, String(e));
        return error('Failed to reply to engagement item', String(e));
      }
    }
  );

  if (!options?.skipAiTools) {
    server.registerTool(
      'inbox_draft_reply',
      {
        description: 'AI-generate a reply draft for an engagement item, personalized with brand voice.',
        inputSchema: z.object({
          item_id: z.string().describe('The engagement item ID'),
          tone: z.string().optional().describe('Desired tone for the reply'),
        }),
        annotations: { readOnlyHint: true },
      },
      async (args) => {
        const ctx = requireContext();
        if (!requirePremiumScope('inbox_draft_reply')) {
          return premiumScopeError();
        }
        try {
          const { createFastLLM } = await import('@/lib/ai/model');
          const { loadBrandContextForAI, formatBrandSystemPrompt } = await import('@/lib/ai/brand-context-loader');

          const item = await prisma.engagementItem.findFirst({
            where: { id: args.item_id, workspaceId: ctx.workspaceId },
          });
          if (!item) return error('Engagement item not found', 'Verify the item_id is correct');

          const brandCtx = await loadBrandContextForAI(ctx.workspaceId);
          const model = createFastLLM({ temperature: 0.6 });

          let systemPrompt = 'You are drafting a reply to a social media engagement on behalf of a brand. Be helpful, on-brand, and concise.';
          if (brandCtx) {
            systemPrompt += '\n\n' + formatBrandSystemPrompt(brandCtx);
          }
          if (args.tone) {
            systemPrompt += `\n\nUse a ${args.tone} tone for this reply.`;
          }

          const userContent = item.parentContent
            ? `Original post/comment: "${item.parentContent}"\n\nTheir ${item.type.toLowerCase()}: "${item.content}"`
            : `Their ${item.type.toLowerCase()}: "${item.content}"`;

          const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Draft a reply to:\n\n${userContent}` },
          ]);
          const draft = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          await logToolCall(ctx, 'inbox_draft_reply', args, true);
          return success({ draft, item: { id: item.id, type: item.type, platform: item.platform }, message: 'Reply draft generated' });
        } catch (e) {
          await logToolCall(ctx, 'inbox_draft_reply', args, false, String(e));
          return error('Failed to draft reply', String(e));
        }
      }
    );
  }

  server.registerTool(
    'inbox_update_status',
    {
      description: 'Update the status of an engagement item.',
      inputSchema: z.object({
        item_id: z.string().describe('The engagement item ID'),
        status: ENGAGEMENT_STATUS_ENUM.describe('New status'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const item = await prisma.engagementItem.findFirst({
          where: { id: args.item_id, workspaceId: ctx.workspaceId },
        });
        if (!item) return error('Engagement item not found', 'Verify the item_id is correct');

        const updated = await prisma.engagementItem.update({
          where: { id: args.item_id },
          data: { status: args.status },
        });
        await logToolCall(ctx, 'inbox_update_status', args, true);
        return success({ item: updated, message: `Status updated to ${args.status}` });
      } catch (e) {
        await logToolCall(ctx, 'inbox_update_status', args, false, String(e));
        return error('Failed to update status', String(e));
      }
    }
  );
}
