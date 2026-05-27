import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { crawlWebsite } from '../crawler';
import { prisma } from '@/lib/prisma';
import { AIMessage } from '@langchain/core/messages';

export async function contextCollectorNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('contextCollectorNode: entering', { websiteUrl: state.websiteUrl, hasDescription: !!state.brandDescription });

  // If brandDescription is provided instead of URL, skip crawling and load connected accounts
  if (state.brandDescription && !state.websiteUrl) {
    logger.info('contextCollectorNode: description mode, skipping crawl');

    // Phase 4: Load connected accounts for the workspace
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: { workspaceId: state.workspaceId, status: 'connected' },
      select: { platform: true, platformUsername: true, followerCount: true },
    });

    const connectedPlatforms = connectedAccounts.map((a) => a.platform);
    const accountDetails: Record<string, { platformUsername?: string; followerCount?: number }> = {};
    for (const acc of connectedAccounts) {
      accountDetails[acc.platform] = {
        platformUsername: acc.platformUsername ?? undefined,
        followerCount: acc.followerCount ?? undefined,
      };
    }

    logger.info('contextCollectorNode: connected accounts loaded', { platformCount: connectedPlatforms.length, platforms: connectedPlatforms });

    // Phase 4: Load recent posts per connected platform
    const recentPostsByPlatform: Record<string, Array<{ content: string; status: string }>> = {};
    if (connectedPlatforms.length > 0) {
      const posts = await prisma.postPlatform.findMany({
        where: {
          platform: { in: connectedPlatforms },
          post: { workspaceId: state.workspaceId },
        },
        orderBy: { createdAt: 'desc' },
        select: { platform: true, content: true, status: true },
      });

      // Group posts by platform, limit to 5 per platform
      for (const post of posts) {
        if (!recentPostsByPlatform[post.platform]) {
          recentPostsByPlatform[post.platform] = [];
        }
        if (recentPostsByPlatform[post.platform].length < 5) {
          recentPostsByPlatform[post.platform].push({ content: post.content, status: post.status });
        }
      }

      logger.info('contextCollectorNode: recent posts loaded', { platformPostCounts: Object.fromEntries(Object.entries(recentPostsByPlatform).map(([k, v]) => [k, v.length])) });
    }

    return {
      connectedPlatforms,
      connectedAccountDetails: accountDetails,
      recentPostsByPlatform,
      currentStep: 'analyze',
    };
  }

  if (!state.websiteUrl) {
    logger.warn('contextCollectorNode: no websiteUrl or brandDescription provided');
    return {
      currentStep: 'error',
      messages: [new AIMessage('No website URL or brand description provided. Please provide one to analyze.')],
    };
  }

  try {
    const crawlResult = await crawlWebsite(state.websiteUrl);
    logger.info('contextCollectorNode: crawl complete', { zoneCount: Object.keys(crawlResult).length });

    // Phase 4: Load connected accounts for the workspace
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: { workspaceId: state.workspaceId, status: 'connected' },
      select: { platform: true, platformUsername: true, followerCount: true },
    });

    const connectedPlatforms = connectedAccounts.map((a) => a.platform);
    const accountDetails: Record<string, { platformUsername?: string; followerCount?: number }> = {};
    for (const acc of connectedAccounts) {
      accountDetails[acc.platform] = {
        platformUsername: acc.platformUsername ?? undefined,
        followerCount: acc.followerCount ?? undefined,
      };
    }

    logger.info('contextCollectorNode: connected accounts loaded', { platformCount: connectedPlatforms.length, platforms: connectedPlatforms });

    // Phase 4: Load recent posts per connected platform
    const recentPostsByPlatform: Record<string, Array<{ content: string; status: string }>> = {};
    if (connectedPlatforms.length > 0) {
      const posts = await prisma.postPlatform.findMany({
        where: {
          platform: { in: connectedPlatforms },
          post: { workspaceId: state.workspaceId },
        },
        orderBy: { createdAt: 'desc' },
        select: { platform: true, content: true, status: true },
      });

      // Group posts by platform, limit to 5 per platform
      for (const post of posts) {
        if (!recentPostsByPlatform[post.platform]) {
          recentPostsByPlatform[post.platform] = [];
        }
        if (recentPostsByPlatform[post.platform].length < 5) {
          recentPostsByPlatform[post.platform].push({ content: post.content, status: post.status });
        }
      }

      logger.info('contextCollectorNode: recent posts loaded', { platformPostCounts: Object.fromEntries(Object.entries(recentPostsByPlatform).map(([k, v]) => [k, v.length])) });
    }

    return {
      crawledContent: crawlResult,
      connectedPlatforms,
      connectedAccountDetails: accountDetails,
      recentPostsByPlatform,
      currentStep: 'analyze',
    };
  } catch (err) {
    logger.error('contextCollectorNode: crawl failed', { error: String(err) });
    return {
      currentStep: 'error',
      messages: [new AIMessage(`Failed to crawl the website: ${err}`)],
    };
  }
}
