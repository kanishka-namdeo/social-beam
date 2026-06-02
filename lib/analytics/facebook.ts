import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';

const GRAPH_API_VERSION = 'v25.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface FacebookImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

/**
 * Import all Facebook Page posts and their analytics for a connected account.
 * Fetches posts created by the Page itself (not visitor posts), creates synthetic
 * Post records with status=EXTERNAL, and creates AnalyticsSnapshot records.
 */
export async function importFacebookPosts(
  workspaceId: string,
  encryptedAccessToken: string,
  pageId: string,
): Promise<FacebookImportResult> {
  const result: FacebookImportResult = {
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

  logger.info('facebook.import.start', { workspaceId, pageId });

  try {
    await importFollowerCount(workspaceId, pageId, accessToken);
    result.followerSnapshotCreated = true;
  } catch (error) {
    logger.warn('facebook.import.follower_count_failed', { workspaceId, error: String(error) });
    result.errors.push(`Follower count failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  try {
    const posts = await fetchAllPagePosts(pageId, accessToken);
    logger.info('facebook.import.posts_found', { workspaceId, count: posts.length });

    for (const fbPost of posts) {
      try {
        await importSinglePost(workspaceId, fbPost, accessToken);
        result.postsSynced += 1;
      } catch (error) {
        logger.warn('facebook.import.single_post_failed', {
          workspaceId,
          postId: fbPost.id,
          error: String(error),
        });
      }
    }
  } catch (error) {
    const msg = `Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown'}`;
    result.errors.push(msg);
    logger.error('facebook.import.posts_fetch_failed', { workspaceId, error: String(error) });
  }

  logger.info('facebook.import.complete', {
    workspaceId,
    postsSynced: result.postsSynced,
    snapshotsCreated: result.snapshotsCreated,
    errorCount: result.errors.length,
  });

  return result;
}

interface FacebookPostRaw {
  id: string;
  message?: string;
  created_time: string;
  from: { id: string; name?: string };
  likes?: { summary?: { total_count: number } };
  comments?: { summary?: { total_count: number } };
  shares?: { count: number };
}

/**
 * Fetch all posts from a Facebook Page feed with pagination.
 * Only returns posts created by the Page itself (from.id === pageId).
 */
async function fetchAllPagePosts(
  pageId: string,
  accessToken: string,
): Promise<FacebookPostRaw[]> {
  const allPosts: FacebookPostRaw[] = [];
  const fields = 'id,message,created_time,from,likes.summary(true),comments.summary(true),shares';
  let url: string | null = `${BASE_URL}/${pageId}/feed?fields=${fields}&limit=100&access_token=${accessToken}`;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  while (url) {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logger.warn('facebook.import.posts_access_denied', { pageId, status: response.status });
        break;
      }
      throw new Error(`Failed to fetch page feed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string };
    };
    const items = (data.data ?? []) as Array<Record<string, unknown>>;

    for (const item of items) {
      const from = item.from as Record<string, unknown> | undefined;
      const fromId = from?.id as string | undefined;

      if (fromId !== pageId) {
        continue;
      }

      const createdTime = item.created_time as string | undefined;
      if (!createdTime) continue;

      const postDate = new Date(createdTime);
      if (postDate < ninetyDaysAgo) continue;

      const likes = item.likes as Record<string, unknown> | undefined;
      const comments = item.comments as Record<string, unknown> | undefined;
      const shares = item.shares as Record<string, unknown> | undefined;

      allPosts.push({
        id: item.id as string,
        message: item.message as string | undefined,
        created_time: createdTime,
        from: { id: fromId as string, name: from?.name as string | undefined },
        likes: likes ? { summary: (likes.summary as Record<string, unknown> | undefined) ? { total_count: ((likes.summary as Record<string, unknown>).total_count as number) ?? 0 } : undefined } : undefined,
        comments: comments ? { summary: (comments.summary as Record<string, unknown> | undefined) ? { total_count: ((comments.summary as Record<string, unknown>).total_count as number) ?? 0 } : undefined } : undefined,
        shares: shares ? { count: (shares.count as number) ?? 0 } : undefined,
      });
    }

    url = data.paging?.next ?? null;
  }

  return allPosts;
}

/**
 * Import analytics for a single Facebook post.
 */
async function importSinglePost(
  workspaceId: string,
  fbPost: FacebookPostRaw,
  accessToken: string,
): Promise<void> {
  const externalId = fbPost.id;

  const existingPost = await prisma.post.findFirst({
    where: {
      workspaceId,
      isExternal: true,
      PostPlatform: {
        some: {
          platform: 'facebook',
          externalId,
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'facebook' },
      },
    },
  });

  let post = existingPost;

  if (!post) {
    post = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title: fbPost.message?.slice(0, 100) ?? `Facebook post ${externalId}`,
        content: {
          text: fbPost.message ?? '',
          media: [],
        },
        status: 'EXTERNAL',
        isExternal: true,
        publishedAt: new Date(fbPost.created_time),
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'facebook',
            content: fbPost.message ?? '',
            status: 'PUBLISHED',
            externalId,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'facebook' },
        },
      },
    });
  }

  const likes = fbPost.likes?.summary?.total_count ?? 0;
  const comments = fbPost.comments?.summary?.total_count ?? 0;
  const shares = fbPost.shares?.count ?? 0;

  const insights = await fetchPostInsights(externalId, accessToken);

  const impressions = insights?.post_media_views ?? 0;
  const engagedUsers = insights?.post_engaged_users ?? 0;
  const totalEngagements = likes + comments + shares;
  const engagementRate = impressions > 0 ? totalEngagements / impressions : 0;

  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post.id,
      platform: 'facebook',
      likes,
      comments,
      shares,
      impressions,
      reach: engagedUsers > 0 ? engagedUsers : impressions,
      clicks: insights?.link_clicks ?? 0,
      saves: 0,
      videoViews: insights?.video_views ?? 0,
      profileVisits: 0,
      websiteClicks: insights?.link_clicks ?? 0,
      engagementRate,
      snapshotAt: new Date(),
    },
  });

  logger.debug('facebook.import.snapshot_created', {
    workspaceId,
    postId: post.id,
    likes,
    comments,
    shares,
    impressions,
  });
}

interface PostInsights {
  post_media_views?: number;
  post_engaged_users?: number;
  link_clicks?: number;
  video_views?: number;
}

/**
 * Fetch insights for a Facebook post.
 */
async function fetchPostInsights(
  postId: string,
  accessToken: string,
): Promise<PostInsights | null> {
  const metricParam = 'post_media_views,post_engaged_users,link_clicks,video_views';
  const url = `${BASE_URL}/${postId}/insights?metric=${metricParam}&period=lifetime&access_token=${accessToken}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      logger.debug('facebook.import.insights_failed', { postId, status: response.status });
      return null;
    }

    const data = await response.json() as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
    };

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const insights: PostInsights = {};
    for (const item of data.data) {
      const value = item.values?.[0]?.value;
      if (value !== undefined && value !== null) {
        switch (item.name) {
          case 'post_media_views':
            insights.post_media_views = value as number;
            break;
          case 'post_engaged_users':
            insights.post_engaged_users = value as number;
            break;
          case 'link_clicks':
            insights.link_clicks = value as number;
            break;
          case 'video_views':
            insights.video_views = value as number;
            break;
        }
      }
    }

    return Object.keys(insights).length > 0 ? insights : null;
  } catch (error) {
    logger.warn('facebook.import.insights_error', { postId, error: String(error) });
    return null;
  }
}

/**
 * Import follower count snapshot for a Facebook Page.
 */
async function importFollowerCount(
  workspaceId: string,
  pageId: string,
  accessToken: string,
): Promise<void> {
  const url = `${BASE_URL}/${pageId}?fields=fan_count,followers_count&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    logger.warn('facebook.import.page_info_failed', { pageId, status: response.status });
    return;
  }

  const data = await response.json() as {
    fan_count?: number;
    followers_count?: number;
  };

  const followers = data.fan_count ?? data.followers_count ?? 0;

  await prisma.followerSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId,
      platform: 'facebook',
      followers,
      following: 0,
      snapshotAt: new Date(),
    },
  });

  logger.info('facebook.import.follower_snapshot', {
    workspaceId,
    followers,
  });
}
