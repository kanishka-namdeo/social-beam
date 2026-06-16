import { prisma } from './prisma';
import { logger } from './logger';

const VALID_PLATFORMS = ['reddit', 'linkedin', 'facebook', 'instagram', 'x'] as const;
type Platform = typeof VALID_PLATFORMS[number];

export interface ScrapedDataCounts {
  redditTrendingPosts: number;
  engagementItems: number;
  externalPosts: number;
  followerSnapshots: number;
  analyticsSnapshots: number;
  redditConfigs: number;
  total: number;
}

export interface DeleteResult {
  redditTrendingPosts: number;
  engagementItems: number;
  externalPosts: number;
  followerSnapshots: number;
  analyticsSnapshots: number;
  redditConfigs: number;
  total: number;
}

function isValidPlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform);
}

export async function getScrapedDataCounts(
  workspaceId: string,
  platform: string
): Promise<ScrapedDataCounts> {
  if (!isValidPlatform(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const isReddit = platform === 'reddit';

  // Get external post IDs for this platform
  const externalPostPlatforms = await prisma.postPlatform.findMany({
    where: {
      platform,
      Post: {
        workspaceId,
        isExternal: true,
      },
    },
    select: {
      postId: true,
    },
  });
  const externalPostIds = externalPostPlatforms.map(pp => pp.postId);

  // Count analytics snapshots for these posts
  const analyticsSnapshots = externalPostIds.length > 0
    ? await prisma.analyticsSnapshot.count({
        where: {
          postId: { in: externalPostIds },
        },
      })
    : 0;

  const [redditTrendingPosts, engagementItems, externalPosts, followerSnapshots, redditConfigs] = await Promise.all([
    isReddit
      ? prisma.redditTrendingPost.count({ where: { workspaceId } })
      : Promise.resolve(0),
    prisma.engagementItem.count({ where: { workspaceId, platform } }),
    prisma.post.count({
      where: {
        workspaceId,
        isExternal: true,
        PostPlatform: {
          some: { platform },
        },
      },
    }),
    prisma.followerSnapshot.count({ where: { workspaceId, platform } }),
    isReddit
      ? prisma.redditSubredditConfig.count({ where: { workspaceId } })
      : Promise.resolve(0),
  ]);

  const total = redditTrendingPosts + engagementItems + externalPosts + followerSnapshots + analyticsSnapshots + redditConfigs;

  logger.info('scraped-data-cleanup.counts', {
    workspaceId,
    platform,
    counts: { redditTrendingPosts, engagementItems, externalPosts, followerSnapshots, analyticsSnapshots, redditConfigs, total },
  });

  return {
    redditTrendingPosts,
    engagementItems,
    externalPosts,
    followerSnapshots,
    analyticsSnapshots,
    redditConfigs,
    total,
  };
}

export async function deleteScrapedDataForPlatform(
  workspaceId: string,
  platform: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<DeleteResult> {
  if (!isValidPlatform(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const client = tx ?? prisma;
  const isReddit = platform === 'reddit';

  const executeDelete = async (db: typeof client) => {
    // 1. Get external post IDs for this platform
    const externalPostPlatforms = await db.postPlatform.findMany({
      where: {
        platform,
        Post: {
          workspaceId,
          isExternal: true,
        },
      },
      select: {
        postId: true,
      },
    });
    const externalPostIds = externalPostPlatforms.map(pp => pp.postId);

    // 2. Delete AnalyticsSnapshot for these posts (FK constraint - must be before Post deletion)
    let analyticsSnapshots = 0;
    if (externalPostIds.length > 0) {
      const deleteResult = await db.analyticsSnapshot.deleteMany({
        where: {
          postId: { in: externalPostIds },
        },
      });
      analyticsSnapshots = deleteResult.count;
    }

    // 3. Delete external posts (PostPlatform records cascade delete)
    let externalPosts = 0;
    if (externalPostIds.length > 0) {
      const deleteResult = await db.post.deleteMany({
        where: {
          id: { in: externalPostIds },
          workspaceId,
          isExternal: true,
        },
      });
      externalPosts = deleteResult.count;
    }

    // 4. Delete FollowerSnapshot
    const followerResult = await db.followerSnapshot.deleteMany({
      where: { workspaceId, platform },
    });
    const followerSnapshots = followerResult.count;

    // 5. Delete EngagementItem
    const engagementResult = await db.engagementItem.deleteMany({
      where: { workspaceId, platform },
    });
    const engagementItems = engagementResult.count;

    // 6. Reddit-specific deletions
    let redditTrendingPosts = 0;
    let redditConfigs = 0;
    if (isReddit) {
      const trendingResult = await db.redditTrendingPost.deleteMany({
        where: { workspaceId },
      });
      redditTrendingPosts = trendingResult.count;

      const configResult = await db.redditSubredditConfig.deleteMany({
        where: { workspaceId },
      });
      redditConfigs = configResult.count;
    }

    const total = redditTrendingPosts + engagementItems + externalPosts + followerSnapshots + analyticsSnapshots + redditConfigs;

    logger.info('scraped-data-cleanup.deleted', {
      workspaceId,
      platform,
      deleted: { redditTrendingPosts, engagementItems, externalPosts, followerSnapshots, analyticsSnapshots, redditConfigs, total },
    });

    return {
      redditTrendingPosts,
      engagementItems,
      externalPosts,
      followerSnapshots,
      analyticsSnapshots,
      redditConfigs,
      total,
    };
  };

  // If no transaction client provided, wrap in a transaction
  if (!tx) {
    return await prisma.$transaction(async (transactionClient) => {
      return await executeDelete(transactionClient);
    });
  }

  return await executeDelete(client);
}
