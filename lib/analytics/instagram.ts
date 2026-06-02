import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v25.0';

function authUrl(accessToken: string): string {
  return `access_token=${accessToken}`;
}

export interface ImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

/**
 * Import all Instagram posts and their analytics for a connected account.
 * Fetches ALL media from the account (not just posts created through our app),
 * creates synthetic Post records with status=EXTERNAL, and AnalyticsSnapshot records.
 */
export async function importInstagramPosts(
  workspaceId: string,
  encryptedAccessToken: string,
  igUserId: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    postsSynced: 0,
    snapshotsCreated: 0,
    followerSnapshotCreated: false,
    errors: [],
  };

  let accessToken: string;
  try {
    accessToken = decryptToken(encryptedAccessToken);
  } catch (error) {
    result.errors.push(`Token decrypt failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return result;
  }

  logger.info('instagram.import.start', { workspaceId, igUserId });

  try {
    // Step 1: Fetch follower count and create FollowerSnapshot
    await importFollowerCount(workspaceId, igUserId, accessToken);
    result.followerSnapshotCreated = true;
  } catch (error) {
    logger.warn('instagram.import.follower_count_failed', { workspaceId, error: String(error) });
    result.errors.push(`Follower count failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  try {
    // Step 2: Fetch all media from the account
    const mediaItems = await fetchAllMedia(igUserId, accessToken);
    logger.info('instagram.import.media_found', { workspaceId, count: mediaItems.length });

    // Step 3: For each media item, create synthetic Post + AnalyticsSnapshot
    for (const media of mediaItems) {
      try {
        await importSingleMedia(workspaceId, media, igUserId, accessToken);
        result.postsSynced += 1;
      } catch (error) {
        logger.warn('instagram.import.single_media_failed', {
          workspaceId,
          mediaId: media.id,
          error: String(error),
        });
      }
    }
  } catch (error) {
    const msg = `Failed to fetch media: ${error instanceof Error ? error.message : 'Unknown'}`;
    result.errors.push(msg);
    logger.error('instagram.import.media_fetch_failed', { workspaceId, error: String(error) });
  }

  logger.info('instagram.import.complete', {
    workspaceId,
    postsSynced: result.postsSynced,
    snapshotsCreated: result.snapshotsCreated,
    errorCount: result.errors.length,
  });

  return result;
}

interface InstagramMediaRaw {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  share_count?: number;
  saved_count?: number;
}

/**
 * Fetch all media items for the Instagram user with pagination.
 * Uses the `after` cursor from the `paging` object.
 */
async function fetchAllMedia(
  igUserId: string,
  accessToken: string,
): Promise<InstagramMediaRaw[]> {
  const allMedia: InstagramMediaRaw[] = [];
  let url: string | null = `${GRAPH_BASE_URL}/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,share_count,saved_count&limit=100&${authUrl(accessToken)}`;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  while (url) {
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logger.warn('instagram.import.media_access_denied', { igUserId, status: response.status });
        break;
      }
      throw new Error(`Failed to fetch media: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string };
    };
    const elements = (data.data ?? []) as Array<Record<string, unknown>>;

    for (const el of elements) {
      const timestamp = el.timestamp as string | undefined;
      if (!timestamp) continue;

      const postDate = new Date(timestamp);
      if (postDate < ninetyDaysAgo) continue;

      allMedia.push({
        id: el.id as string,
        caption: el.caption as string | undefined,
        media_type: el.media_type as string,
        media_url: el.media_url as string | undefined,
        permalink: el.permalink as string | undefined,
        timestamp,
        like_count: (el.like_count as number) ?? 0,
        comments_count: (el.comments_count as number) ?? 0,
        share_count: (el.share_count as number) ?? 0,
        saved_count: (el.saved_count as number) ?? 0,
      });
    }

    // Pagination via paging.next
    url = data.paging?.next ?? null;
  }

  return allMedia;
}

/**
 * Import analytics for a single Instagram media item.
 * Creates synthetic Post + PostPlatform if not already present, then creates AnalyticsSnapshot.
 */
async function importSingleMedia(
  workspaceId: string,
  media: InstagramMediaRaw,
  igUserId: string,
  accessToken: string,
): Promise<void> {
  const existingPost = await prisma.post.findFirst({
    where: {
      workspaceId,
      isExternal: true,
      PostPlatform: {
        some: {
          platform: 'instagram',
          externalId: media.id,
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'instagram' },
      },
    },
  });

  let post = existingPost;

  if (!post) {
    // Create synthetic Post record
    post = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title: media.caption?.slice(0, 100) ?? `Instagram post ${media.id}`,
        content: {
          text: media.caption ?? '',
          media: media.media_url ? [{ type: media.media_type, url: media.media_url }] : [],
        },
        status: 'EXTERNAL',
        isExternal: true,
        publishedAt: new Date(media.timestamp),
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'instagram',
            content: media.caption ?? '',
            status: 'PUBLISHED',
            externalId: media.id,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'instagram' },
        },
      },
    });
  }

  // Fetch insights for this media (reach, views, engagement, total_interactions)
  const insights = await fetchMediaInsights(media.id, accessToken);

  // Create analytics snapshot
  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post.id,
      platform: 'instagram',
      likes: media.like_count ?? 0,
      comments: media.comments_count ?? 0,
      shares: media.share_count ?? 0,
      impressions: insights.impressions,
      reach: insights.reach,
      clicks: 0,
      saves: media.saved_count ?? 0,
      videoViews: insights.videoViews,
      profileVisits: 0,
      websiteClicks: 0,
      engagementRate: insights.engagementRate,
      snapshotAt: new Date(),
    },
  });

  logger.debug('instagram.import.snapshot_created', {
    workspaceId,
    postId: post.id,
    mediaId: media.id,
    reach: insights.reach,
  });
}

interface MediaInsights {
  impressions: number;
  reach: number;
  videoViews: number;
  engagementRate: number;
}

/**
 * Fetch insights for a single Instagram media item.
 * Uses the /insights endpoint with lifetime metrics.
 * For personal accounts this returns 400 — handled gracefully with 0s.
 */
async function fetchMediaInsights(
  mediaId: string,
  accessToken: string,
): Promise<MediaInsights> {
  const url = `${GRAPH_BASE_URL}/${mediaId}/insights?metric=reach,views,engagement,total_interactions&period=lifetime&${authUrl(accessToken)}`;

  try {
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      if (response.status === 400) {
        // Insights only available for Professional accounts
        logger.warn('instagram.import.insights_not_available', {
          mediaId,
          reason: 'Personal account or Professional API not approved',
        });
        return { impressions: 0, reach: 0, videoViews: 0, engagementRate: 0 };
      }
      if (response.status === 401 || response.status === 403) {
        logger.warn('instagram.import.insights_access_denied', { mediaId, status: response.status });
        return { impressions: 0, reach: 0, videoViews: 0, engagementRate: 0 };
      }
      logger.warn('instagram.import.insights_failed', { mediaId, status: response.status });
      return { impressions: 0, reach: 0, videoViews: 0, engagementRate: 0 };
    }

    const data = await response.json() as {
      data?: Array<{
        name: string;
        values?: Array<{ value: number }>;
        title?: string;
      }>;
    };

    const metrics = data.data ?? [];
    const metricMap: Record<string, number> = {};
    for (const m of metrics) {
      const value = m.values?.[0]?.value ?? 0;
      metricMap[m.name] = value;
    }

    const reach = metricMap['reach'] ?? 0;
    const views = metricMap['views'] ?? 0;
    const engagement = metricMap['engagement'] ?? 0;
    const totalInteractions = metricMap['total_interactions'] ?? 0;

    const totalEngagements = engagement > 0 ? engagement : totalInteractions;
    const engagementRate = reach > 0 ? totalEngagements / reach : 0;

    return {
      impressions: reach,
      reach,
      videoViews: views,
      engagementRate,
    };
  } catch (error) {
    logger.warn('instagram.import.insights_error', { mediaId, error: String(error) });
    return { impressions: 0, reach: 0, videoViews: 0, engagementRate: 0 };
  }
}

/**
 * Import follower count snapshot for the Instagram account.
 */
async function importFollowerCount(
  workspaceId: string,
  igUserId: string,
  accessToken: string,
): Promise<void> {
  const url = `${GRAPH_BASE_URL}/${igUserId}?fields=followers_count&${authUrl(accessToken)}`;

  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    logger.warn('instagram.import.follower_fetch_failed', { igUserId, status: response.status });
    return;
  }

  const data = await response.json() as { followers_count?: number };
  const followerCount = data.followers_count ?? 0;

  await prisma.followerSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId,
      platform: 'instagram',
      followers: followerCount,
      following: 0,
      snapshotAt: new Date(),
    },
  });

  logger.info('instagram.import.follower_snapshot', {
    workspaceId,
    followerCount,
  });
}
