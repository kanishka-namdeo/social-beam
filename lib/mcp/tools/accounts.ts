import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';

const PLATFORM_ENUM = z.enum([
  'instagram', 'facebook', 'x', 'linkedin',
  'tiktok', 'pinterest', 'threads', 'bluesky',
  'google_business', 'youtube',
]);

export function registerAccountTools(server: McpServer) {
  server.registerTool(
    'accounts_list',
    {
      description: 'List all connected social platform accounts for this workspace. Returns platform, username, status, follower count, and last sync time for each connection.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ctx = requireContext();
      try {
        const accounts = await prisma.connectedAccount.findMany({
          where: { workspaceId: ctx.workspaceId },
          select: {
            platform: true,
            platformUsername: true,
            status: true,
            followerCount: true,
            lastSyncedAt: true,
          },
        });
        await logToolCall(ctx, 'accounts_list', {}, true);
        return success({ accounts });
      } catch (e) {
        await logToolCall(ctx, 'accounts_list', {}, false, String(e));
        return error('Failed to list accounts', String(e));
      }
    }
  );

  server.registerTool(
    'accounts_status',
    {
      description: 'Get connection status for a specific platform account.',
      inputSchema: z.object({
        platform: PLATFORM_ENUM.describe('The platform to check connection status for'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const account = await prisma.connectedAccount.findFirst({
          where: { workspaceId: ctx.workspaceId, platform: args.platform },
          select: {
            platform: true,
            platformUsername: true,
            status: true,
            followerCount: true,
            lastSyncedAt: true,
            lastRefreshAt: true,
          },
        });
        if (!account) return error(`No connected account for ${args.platform}`, 'Use accounts_list to see available accounts');
        await logToolCall(ctx, 'accounts_status', args, true);
        return success({ account });
      } catch (e) {
        await logToolCall(ctx, 'accounts_status', args, false, String(e));
        return error('Failed to get account status', String(e));
      }
    }
  );

  server.registerTool(
    'accounts_disconnect',
    {
      description: 'Disconnect a platform account from this workspace. This is a destructive action.',
      inputSchema: z.object({
        platform: PLATFORM_ENUM.describe('The platform to disconnect'),
      }),
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const result = await prisma.connectedAccount.deleteMany({
          where: { workspaceId: ctx.workspaceId, platform: args.platform },
        });
        if (result.count === 0) return error(`No connected account for ${args.platform} to disconnect`);
        await logToolCall(ctx, 'accounts_disconnect', args, true);
        return success({ message: `Disconnected ${args.platform} account`, deleted: result.count });
      } catch (e) {
        await logToolCall(ctx, 'accounts_disconnect', args, false, String(e));
        return error('Failed to disconnect account', String(e));
      }
    }
  );
}
