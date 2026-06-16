import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpUserContext } from './types';
import { mcpContext } from './server';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_PLATFORMS } from '@/lib/config/platforms';

export function registerResources(server: McpServer, _ctx: McpUserContext): void {
  server.registerResource(
    'brand-context',
    'brand://context',
    {
      title: 'Brand Context',
      description: 'Current brand identity, voice, audience, and goals',
      mimeType: 'application/json',
    },
    async () => {
      const ctx = mcpContext.getStore();
      if (!ctx) throw new Error('No MCP context available');
      try {
        const brandContext = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
          include: { PlatformContext: true },
        });
        if (!brandContext) {
          return {
            contents: [{
              uri: 'brand://context',
              text: JSON.stringify({ error: 'No brand context found', agentHint: 'Set up brand context via the dashboard' }),
              mimeType: 'application/json',
            }],
          };
        }
        return {
          contents: [{
            uri: 'brand://context',
            text: JSON.stringify(brandContext, null, 2),
            mimeType: 'application/json',
          }],
        };
      } catch (e) {
        return {
          contents: [{
            uri: 'brand://context',
            text: JSON.stringify({ error: 'Failed to fetch brand context', details: String(e) }),
            mimeType: 'application/json',
          }],
        };
      }
    },
  );

  server.registerResource(
    'brand-health',
    'brand://health',
    {
      title: 'Brand Health',
      description: 'Brand health score and field confidence breakdown',
      mimeType: 'application/json',
    },
    async () => {
      const ctx = mcpContext.getStore();
      if (!ctx) throw new Error('No MCP context available');

      try {
        const brandContext = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
          include: { BrandFieldState: true },
        });

        if (!brandContext) {
          return {
            contents: [
              {
                uri: 'brand://health',
                text: JSON.stringify({ error: 'No brand context found' }, null, 2),
                mimeType: 'application/json',
              },
            ],
          };
        }

        const fieldStates = brandContext.BrandFieldState;
        const avgConfidence =
          fieldStates.length > 0
            ? fieldStates.reduce((sum, f) => sum + f.confidence, 0) / fieldStates.length
            : 0;

        const health = {
          trainingStatus: brandContext.trainingStatus,
          lastTrainedAt: brandContext.lastTrainedAt,
          averageConfidence: Math.round(avgConfidence * 100) / 100,
          fieldCount: fieldStates.length,
          fields: fieldStates.map((f) => ({
            fieldName: f.fieldName,
            confidence: f.confidence,
            stability: f.stability,
            signalCount: f.signalCount,
            lastUpdated: f.lastUpdated,
          })),
        };

        return {
          contents: [
            {
              uri: 'brand://health',
              text: JSON.stringify(health, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (e) {
        return {
          contents: [
            {
              uri: 'brand://health',
              text: JSON.stringify({ error: 'Failed to fetch brand health', details: String(e) }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );

  server.registerResource(
    'connected-accounts',
    'accounts://connected',
    {
      title: 'Connected Accounts',
      description: 'List of connected platform accounts with status',
      mimeType: 'application/json',
    },
    async () => {
      const ctx = mcpContext.getStore();
      if (!ctx) throw new Error('No MCP context available');

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

        return {
          contents: [
            {
              uri: 'accounts://connected',
              text: JSON.stringify(accounts, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (e) {
        return {
          contents: [
            {
              uri: 'accounts://connected',
              text: JSON.stringify({ error: 'Failed to fetch connected accounts', details: String(e) }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );

  server.registerResource(
    'platform-config',
    'config://platforms',
    {
      title: 'Platform Configuration',
      description: 'Supported platforms with character limits and capabilities',
      mimeType: 'application/json',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'config://platforms',
            text: JSON.stringify(SUPPORTED_PLATFORMS, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );
}
