import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { crawlWebsite } from '../crawler';
import { prisma } from '@/lib/prisma';
import { AIMessage } from '@langchain/core/messages';
import { logger } from '@/lib/logger';

const CRAWL_TIMEOUT_MS = 90_000;

export async function contextCollectorNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const log = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  log.info('contextCollectorNode: entering', { websiteUrl: state.websiteUrl, hasDescription: !!state.brandDescription });

  // If brandDescription is provided instead of URL, skip crawling and load connected accounts
  if (state.brandDescription && !state.websiteUrl) {
    log.info('contextCollectorNode: description mode, skipping crawl');
    return loadConnectedAccounts(state);
  }

  if (!state.websiteUrl) {
    log.warn('contextCollectorNode: no websiteUrl or brandDescription provided');
    return {
      currentStep: 'error',
      messages: [new AIMessage('No website URL or brand description provided. Please provide one to analyze.')],
    };
  }

  try {
    // Track crawled pages in real-time via state updates for SSE streaming
    const crawledPages: string[] = [];
    const onProgress = (page: string, _depth: number, zoneCount: number) => {
      crawledPages.push(page);
      logger.info('agent.crawler.page_complete', {
        url: state.websiteUrl,
        page,
        zoneCount,
        totalPages: crawledPages.length,
      });
    };

    const crawlResult = await Promise.race([
      crawlWebsite(state.websiteUrl, { onProgress }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Crawl timed out after ${CRAWL_TIMEOUT_MS / 1000}s`)), CRAWL_TIMEOUT_MS),
      ),
    ]);

    log.info('contextCollectorNode: crawl complete', {
      zoneCount: Object.keys(crawlResult).length,
      pagesCrawled: crawledPages.length,
    });

    // Handle empty content case
    if (Object.keys(crawlResult).length === 0) {
      logger.warn('agent.crawler.empty_content', { url: state.websiteUrl });
      return {
        currentStep: 'error',
        messages: [new AIMessage('The website loaded but had no readable content. Try a different URL.')],
        __crawlError: 'No readable content found on the website',
      };
    }

    const { connectedPlatforms, connectedAccountDetails, recentPostsByPlatform } = await loadConnectedAccounts(state);

    return {
      crawledContent: crawlResult,
      connectedPlatforms,
      connectedAccountDetails,
      recentPostsByPlatform,
      currentStep: 'analyze',
      __crawlPages: crawledPages,
    };
  } catch (err) {
    const errMsg = String(err);
    log.error('contextCollectorNode: crawl failed', { error: errMsg });

    // Categorize the error for downstream SSE handling
    let errorMessage: string;
    if (errMsg.includes('timed out') || errMsg.includes('timeout')) {
      errorMessage = 'Analysis took too long. This site may be too complex — try describing your brand instead.';
    } else if (errMsg.includes('403') || errMsg.includes('blocked') || errMsg.includes('CAPTCHA')) {
      errorMessage = 'This website blocks automated visits. Try describing your brand instead.';
    } else if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
      errorMessage = 'Crawl was canceled.';
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('ERR_NAME_NOT_RESOLVED') || errMsg.includes('network')) {
      errorMessage = 'Could not reach this website. Check the URL and try again.';
    } else {
      errorMessage = `Failed to crawl the website: ${errMsg}`;
    }

    return {
      currentStep: 'error',
      messages: [new AIMessage(errorMessage)],
      __crawlError: errMsg,
    };
  }
}

async function loadConnectedAccounts(state: BrandAnalyzerStateType) {
  const log = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

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

  log.info('contextCollectorNode: connected accounts loaded', { platformCount: connectedPlatforms.length, platforms: connectedPlatforms });

  const recentPostsByPlatform: Record<string, Array<{ content: string; status: string }>> = {};
  if (connectedPlatforms.length > 0) {
    const posts = await prisma.postPlatform.findMany({
      where: {
        platform: { in: connectedPlatforms },
        Post: { workspaceId: state.workspaceId },
      },
      orderBy: { createdAt: 'desc' },
      select: { platform: true, content: true, status: true },
    });

    for (const post of posts) {
      if (!recentPostsByPlatform[post.platform]) {
        recentPostsByPlatform[post.platform] = [];
      }
      if (recentPostsByPlatform[post.platform].length < 5) {
        recentPostsByPlatform[post.platform].push({ content: post.content, status: post.status });
      }
    }

    log.info('contextCollectorNode: recent posts loaded', {
      platformPostCounts: Object.fromEntries(Object.entries(recentPostsByPlatform).map(([k, v]) => [k, v.length])),
    });
  }

  return { connectedPlatforms, connectedAccountDetails: accountDetails, recentPostsByPlatform };
}
