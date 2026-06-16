import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { JobLogger } from '@/lib/sync/job-logger';
import { scrapeTikTokPosts, type TikTokPost } from '@/lib/cloakbrowser/platforms/tiktok';
import { scrapePinterestPins, type PinterestPin } from '@/lib/cloakbrowser/platforms/pinterest';
import { scrapeThreadsPosts, type ThreadsPost } from '@/lib/cloakbrowser/platforms/threads';
import { scrapeYouTubeChannelPosts } from '@/lib/cloakbrowser/platforms/youtube';
import { scrapeBlueskyPosts, type BlueskyPost } from '@/lib/cloakbrowser/platforms/bluesky';

export interface BrowserSyncResult {
  platform: string;
  postsSynced: number;
  errors: string[];
}

type ProgressCallback = (phase: 'scraping' | 'storing', postsFound: number, postsStored: number) => void;

/**
 * Run a browser-based sync for a given platform.
 * Scrapes posts via cloakbrowser and stores them as Post + PostPlatform records.
 */
export async function syncBrowserPlatform(
  workspaceId: string,
  platform: string,
  platformUserId: string,
  jobLogger: JobLogger,
  onProgress?: ProgressCallback,
): Promise<BrowserSyncResult> {
  const result: BrowserSyncResult = { platform, postsSynced: 0, errors: [] };

  jobLogger.info('Starting browser sync', { workspaceId, platform, platformUserId });
  logger.info('browser.sync.start', { workspaceId, platform, platformUserId });

  try {
    switch (platform.toLowerCase()) {
      case 'tiktok': {
        const posts = await scrapeTikTokPosts(platformUserId);
        jobLogger.info('Scraped posts', { platform, count: posts.length });
        onProgress?.('scraping', posts.length, 0);
        result.postsSynced = await storeTikTokPosts(workspaceId, posts, onProgress);
        break;
      }
      case 'pinterest': {
        const pins = await scrapePinterestPins(platformUserId);
        jobLogger.info('Scraped posts', { platform, count: pins.length });
        onProgress?.('scraping', pins.length, 0);
        result.postsSynced = await storePinterestPins(workspaceId, pins, platform, onProgress);
        break;
      }
      case 'threads': {
        const posts = await scrapeThreadsPosts(platformUserId);
        jobLogger.info('Scraped posts', { platform, count: posts.length });
        onProgress?.('scraping', posts.length, 0);
        result.postsSynced = await storeThreadsPosts(workspaceId, posts, platform, onProgress);
        break;
      }
      case 'youtube': {
        const posts = await scrapeYouTubeChannelPosts(platformUserId);
        jobLogger.info('Scraped posts', { platform, count: posts.length });
        onProgress?.('scraping', posts.length, 0);
        result.postsSynced = await storeYouTubePosts(workspaceId, posts, platform, onProgress);
        break;
      }
      case 'bluesky': {
        const posts = await scrapeBlueskyPosts(platformUserId);
        jobLogger.info('Scraped posts', { platform, count: posts.length });
        onProgress?.('scraping', posts.length, 0);
        result.postsSynced = await storeBlueskyPosts(workspaceId, posts, platform, onProgress);
        break;
      }
      default:
        result.errors.push(`Unsupported browser platform: ${platform}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Browser sync failed: ${msg}`);
    jobLogger.error('Browser sync failed', { workspaceId, platform, error: msg });
    logger.error('browser.sync.error', { workspaceId, platform, error: msg });
  }

  if (result.postsSynced > 0) {
    await prisma.connectedAccount.updateMany({
      where: { workspaceId, platform },
      data: { lastSyncedAt: new Date() },
    });
  }

  jobLogger.info('Browser sync complete', { platform, postsSynced: result.postsSynced, errors: result.errors.length });
  logger.info('browser.sync.complete', { workspaceId, platform, postsSynced: result.postsSynced, errors: result.errors.length });
  return result;
}

async function storeTikTokPosts(
  workspaceId: string,
  posts: TikTokPost[],
  onProgress?: ProgressCallback,
): Promise<number> {
  let stored = 0;
  for (const post of posts) {
    try {
      const existing = await prisma.post.findFirst({
        where: { workspaceId, isExternal: true, PostPlatform: { some: { platform: 'tiktok', externalId: post.id } } },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: post.description.slice(0, 200) || 'TikTok Video',
          content: { text: post.description, media: post.videoUrl ? [{ type: 'video', url: post.videoUrl }] : [] },
          status: 'EXTERNAL',
          isExternal: true,
          publishedAt: post.timestamp,
          PostPlatform: {
            create: {
              id: crypto.randomUUID(),
              platform: 'tiktok',
              content: JSON.stringify({ likes: post.likes, comments: post.comments, shares: post.shares, views: post.views }),
              externalId: post.id,
              postUrl: post.videoUrl,
              status: 'PUBLISHED',
            },
          },
        },
      });
      stored++;
      onProgress?.('storing', posts.length, stored);
    } catch (error) {
      logger.warn('browser.sync.tiktok.store_error', { postId: post.id, error: String(error) });
    }
  }
  return stored;
}

async function storePinterestPins(
  workspaceId: string,
  pins: PinterestPin[],
  platform: string,
  onProgress?: ProgressCallback,
): Promise<number> {
  let stored = 0;
  for (const pin of pins) {
    try {
      const existing = await prisma.post.findFirst({
        where: { workspaceId, isExternal: true, PostPlatform: { some: { platform, externalId: pin.id } } },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: pin.title || 'Pinterest Pin',
          content: { text: pin.description, media: pin.imageUrl ? [{ type: 'image', url: pin.imageUrl }] : [] },
          status: 'EXTERNAL',
          isExternal: true,
          publishedAt: pin.timestamp,
          PostPlatform: {
            create: {
              id: crypto.randomUUID(),
              platform,
              content: JSON.stringify({ saves: pin.saves, comments: pin.comments }),
              externalId: pin.id,
              postUrl: pin.link,
              status: 'PUBLISHED',
            },
          },
        },
      });
      stored++;
      onProgress?.('storing', pins.length, stored);
    } catch (error) {
      logger.warn('browser.sync.pinterest.store_error', { pinId: pin.id, error: String(error) });
    }
  }
  return stored;
}

async function storeThreadsPosts(
  workspaceId: string,
  posts: ThreadsPost[],
  platform: string,
  onProgress?: ProgressCallback,
): Promise<number> {
  let stored = 0;
  for (const post of posts) {
    try {
      const existing = await prisma.post.findFirst({
        where: { workspaceId, isExternal: true, PostPlatform: { some: { platform, externalId: post.id } } },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: post.text.slice(0, 200) || 'Threads Post',
          content: { text: post.text },
          status: 'EXTERNAL',
          isExternal: true,
          publishedAt: post.timestamp,
          PostPlatform: {
            create: {
              id: crypto.randomUUID(),
              platform,
              content: JSON.stringify({ likes: post.likes, replies: post.replies, reposts: post.reposts }),
              externalId: post.id,
              status: 'PUBLISHED',
            },
          },
        },
      });
      stored++;
      onProgress?.('storing', posts.length, stored);
    } catch (error) {
      logger.warn('browser.sync.threads.store_error', { postId: post.id, error: String(error) });
    }
  }
  return stored;
}

async function storeYouTubePosts(
  workspaceId: string,
  posts: unknown[],
  platform: string,
  onProgress?: ProgressCallback,
): Promise<number> {
  let stored = 0;
  for (const raw of posts) {
    try {
      const post = raw as { id?: string; title?: string; description?: string; url?: string; timestamp?: Date };
      if (!post.id) continue;

      const existing = await prisma.post.findFirst({
        where: { workspaceId, isExternal: true, PostPlatform: { some: { platform, externalId: post.id } } },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: post.title || 'YouTube Post',
          content: { text: post.description || '' },
          status: 'EXTERNAL',
          isExternal: true,
          publishedAt: post.timestamp,
          PostPlatform: {
            create: {
              id: crypto.randomUUID(),
              platform,
              content: JSON.stringify(raw),
              externalId: post.id,
              postUrl: post.url,
              status: 'PUBLISHED',
            },
          },
        },
      });
      stored++;
      onProgress?.('storing', posts.length, stored);
    } catch (error) {
      logger.warn('browser.sync.youtube.store_error', { error: String(error) });
    }
  }
  return stored;
}

async function storeBlueskyPosts(
  workspaceId: string,
  posts: BlueskyPost[],
  platform: string,
  onProgress?: ProgressCallback,
): Promise<number> {
  let stored = 0;
  for (const post of posts) {
    try {
      const existing = await prisma.post.findFirst({
        where: { workspaceId, isExternal: true, PostPlatform: { some: { platform, externalId: post.id } } },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: post.text.slice(0, 200) || 'Bluesky Post',
          content: { text: post.text },
          status: 'EXTERNAL',
          isExternal: true,
          publishedAt: post.timestamp,
          PostPlatform: {
            create: {
              id: crypto.randomUUID(),
              platform,
              content: JSON.stringify({ likes: post.likes, replies: post.replies, reposts: post.reposts, author: post.author, authorHandle: post.authorHandle }),
              externalId: post.id,
              status: 'PUBLISHED',
            },
          },
        },
      });
      stored++;
      onProgress?.('storing', posts.length, stored);
    } catch (error) {
      logger.warn('browser.sync.bluesky.store_error', { postId: post.id, error: String(error) });
    }
  }
  return stored;
}
