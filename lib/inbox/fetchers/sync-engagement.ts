import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { createInboxAdapter } from '@/lib/inbox/adapters';
import type { PlatformName, EngagementType } from '@/lib/inbox/types';

const PLATFORMS: PlatformName[] = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok'];

interface SyncResult {
  totalNew: number;
  totalErrors: number;
  platformResults: Record<string, { new: number; errors: number }>;
}

export async function syncEngagement(workspaceId: string): Promise<SyncResult> {
  const result: SyncResult = {
    totalNew: 0,
    totalErrors: 0,
    platformResults: {},
  };

  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId, status: 'connected' },
    select: { platform: true },
  });

  const connectedPlatforms = accounts.map((a) => a.platform as PlatformName);

  for (const platform of PLATFORMS) {
    if (!connectedPlatforms.includes(platform)) {
      result.platformResults[platform] = { new: 0, errors: 0 };
      continue;
    }

    const adapter = await createInboxAdapter(platform, workspaceId);
    if (!adapter) {
      result.platformResults[platform] = { new: 0, errors: 1 };
      result.totalErrors++;
      continue;
    }

    // Get last sync time for this platform
    const lastSynced = await prisma.engagementItem.findFirst({
      where: { workspaceId, platform },
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    });
    const since = lastSynced?.syncedAt;

    try {
      // Fetch comments
      const comments = await adapter.fetchComments(since ?? undefined);
      for (const c of comments) {
        await upsertEngagementItem({
          workspaceId,
          platform,
          type: 'COMMENT' as EngagementType,
          platformItemId: c.platformItemId,
          platformUrl: c.platformUrl,
          authorName: c.authorName,
          authorAvatar: c.authorAvatar,
          content: c.content,
          parentContent: c.parentContent,
          parentId: c.parentId,
        });
      }

      // Fetch mentions
      const mentions = await adapter.fetchMentions(since ?? undefined);
      for (const m of mentions) {
        await upsertEngagementItem({
          workspaceId,
          platform,
          type: 'MENTION' as EngagementType,
          platformItemId: m.platformItemId,
          platformUrl: m.platformUrl,
          authorName: m.authorName,
          authorAvatar: m.authorAvatar,
          content: m.content,
          parentContent: m.parentContent,
        });
      }

      // Fetch DMs
      const dms = await adapter.fetchDMs(since ?? undefined);
      for (const d of dms) {
        await upsertEngagementItem({
          workspaceId,
          platform,
          type: 'DM' as EngagementType,
          platformItemId: d.platformItemId,
          platformUrl: d.platformUrl,
          authorName: d.authorName,
          authorAvatar: d.authorAvatar,
          content: d.content,
          parentContent: undefined,
          parentId: d.conversationId,
        });
      }

      const newCount = comments.length + mentions.length + dms.length;
      result.totalNew += newCount;
      result.platformResults[platform] = { new: newCount, errors: 0 };

      logger.info('inbox.sync.platform_complete', {
        workspaceId,
        platform,
        comments: comments.length,
        mentions: mentions.length,
        dms: dms.length,
      });
    } catch (err) {
      result.totalErrors++;
      result.platformResults[platform] = { new: 0, errors: 1 };
      logger.error('inbox.sync.platform_failed', {
        workspaceId,
        platform,
        error: String(err),
      });
    }
  }

  logger.info('inbox.sync.complete', {
    workspaceId,
    totalNew: result.totalNew,
    totalErrors: result.totalErrors,
  });

  return result;
}

async function upsertEngagementItem(data: {
  workspaceId: string;
  platform: string;
  type: EngagementType;
  platformItemId: string;
  platformUrl?: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  parentContent?: string;
  parentId?: string;
}): Promise<void> {
  await prisma.engagementItem.upsert({
    where: {
      workspaceId_platformItemId: {
        workspaceId: data.workspaceId,
        platformItemId: data.platformItemId,
      },
    },
    create: {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
      platform: data.platform,
      type: data.type,
      platformItemId: data.platformItemId,
      platformUrl: data.platformUrl,
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      content: data.content,
      parentContent: data.parentContent,
      parentId: data.parentId,
      syncedAt: new Date(),
    },
    update: {
      content: data.content,
      syncedAt: new Date(),
      ...(data.parentContent ? { parentContent: data.parentContent } : {}),
    },
  });
}
