import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';

const BASE_URL = 'https://api.x.com/2';

const X_HEADERS = {
  'Content-Type': 'application/json',
};

function authHeader(accessToken: string): Record<string, string> {
  return { ...X_HEADERS, Authorization: `Bearer ${accessToken}` };
}

export interface ImportResult {
  postsSynced: number;
  snapshotsCreated: number;
  followerSnapshotCreated: boolean;
  errors: string[];
}

/**
 * Import all tweets and their analytics for a connected X account.
 * Fetches tweets from the last 90 days, creates synthetic Posts with status=EXTERNAL,
 * and creates AnalyticsSnapshot records from public_metrics.
 */
export async function importXTweets(
  workspaceId: string,
  encryptedAccessToken: string,
  userId: string,
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

  logger.info('x.import.start', { workspaceId, userId });

  try {
    await importFollowerCount(workspaceId, userId, accessToken);
    result.followerSnapshotCreated = true;
  } catch (error) {
    logger.warn('x.import.follower_count_failed', { workspaceId, error: String(error) });
    result.errors.push(`Follower count failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  try {
    const tweets = await fetchAllTweets(userId, accessToken);
    logger.info('x.import.tweets_found', { workspaceId, count: tweets.length });

    for (const tweet of tweets) {
      try {
        await importSingleTweet(workspaceId, tweet);
        result.postsSynced += 1;
      } catch (error) {
        logger.warn('x.import.single_tweet_failed', {
          workspaceId,
          tweetId: tweet.id,
          error: String(error),
        });
      }
    }
  } catch (error) {
    const msg = `Failed to fetch tweets: ${error instanceof Error ? error.message : 'Unknown'}`;
    result.errors.push(msg);
    logger.error('x.import.tweets_fetch_failed', { workspaceId, error: String(error) });
  }

  logger.info('x.import.complete', {
    workspaceId,
    postsSynced: result.postsSynced,
    snapshotsCreated: result.snapshotsCreated,
    errorCount: result.errors.length,
  });

  return result;
}

interface XTweetRaw {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    impression_count?: number;
    bookmark_count?: number;
  };
}

/**
 * Fetch all tweets for the user with pagination.
 * Limits to last 90 days and max 100 tweets per sync.
 */
async function fetchAllTweets(
  userId: string,
  accessToken: string,
): Promise<XTweetRaw[]> {
  const allTweets: XTweetRaw[] = [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const startTime = ninetyDaysAgo.toISOString();

  let paginationToken: string | null = null;
  let tweetCount = 0;
  const maxTweets = 100;

  while (tweetCount < maxTweets) {
    const remaining = maxTweets - tweetCount;
    const maxResults = Math.min(remaining, 100);

    const params = new URLSearchParams({
      max_results: String(maxResults),
      'tweet.fields': 'public_metrics,created_at,author_id',
      start_time: startTime,
    });

    if (paginationToken) {
      params.set('pagination_token', paginationToken);
    }

    const url = `${BASE_URL}/users/${encodeURIComponent(userId)}/tweets?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader(accessToken),
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        logger.warn('x.import.tweets_access_denied', { userId, status: response.status });
        break;
      }
      throw new Error(`Failed to fetch tweets: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
      data?: Array<Record<string, unknown>>;
      meta?: { next_token?: string; result_count?: number };
    };

    const tweets = (data.data ?? []) as Array<Record<string, unknown>>;

    for (const tweet of tweets) {
      const id = tweet.id as string | undefined;
      const text = tweet.text as string | undefined;
      const created_at = tweet.created_at as string | undefined;
      const author_id = tweet.author_id as string | undefined;
      const public_metrics = tweet.public_metrics as Record<string, unknown> | undefined;

      if (!id || !text || !created_at) continue;

      allTweets.push({
        id,
        text,
        created_at,
        author_id: author_id ?? userId,
        public_metrics: {
          like_count: (public_metrics?.like_count as number) ?? 0,
          retweet_count: (public_metrics?.retweet_count as number) ?? 0,
          reply_count: (public_metrics?.reply_count as number) ?? 0,
          impression_count: (public_metrics?.impression_count as number) ?? 0,
          bookmark_count: (public_metrics?.bookmark_count as number) ?? 0,
        },
      });
    }

    tweetCount += tweets.length;
    paginationToken = data.meta?.next_token ?? null;

    if (!paginationToken) break;
  }

  return allTweets;
}

/**
 * Import a single tweet as a synthetic Post + AnalyticsSnapshot.
 */
async function importSingleTweet(
  workspaceId: string,
  tweet: XTweetRaw,
): Promise<void> {
  const tweetId = tweet.id;

  const existingPost = await prisma.post.findFirst({
    where: {
      workspaceId,
      isExternal: true,
      PostPlatform: {
        some: {
          platform: 'x',
          externalId: tweetId,
        },
      },
    },
    include: {
      PostPlatform: {
        where: { platform: 'x' },
      },
    },
  });

  let post = existingPost;

  if (!post) {
    post = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title: tweet.text.slice(0, 100),
        content: {
          text: tweet.text,
          media: [],
        },
        status: 'EXTERNAL',
        isExternal: true,
        publishedAt: new Date(tweet.created_at),
        PostPlatform: {
          create: {
            id: crypto.randomUUID(),
            platform: 'x',
            content: tweet.text,
            status: 'PUBLISHED',
            externalId: tweetId,
          },
        },
      },
      include: {
        PostPlatform: {
          where: { platform: 'x' },
        },
      },
    });
  }

  const metrics = tweet.public_metrics;
  const likes = metrics.like_count ?? 0;
  const shares = metrics.retweet_count ?? 0;
  const comments = metrics.reply_count ?? 0;
  const impressions = metrics.impression_count ?? 0;
  const saves = metrics.bookmark_count ?? 0;
  const totalEngagements = likes + comments + shares;
  const engagementRate = impressions > 0 ? totalEngagements / impressions : 0;

  await prisma.analyticsSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      postId: post.id,
      platform: 'x',
      likes,
      comments,
      shares,
      impressions,
      reach: impressions,
      clicks: 0,
      saves,
      videoViews: 0,
      profileVisits: 0,
      websiteClicks: 0,
      engagementRate,
      snapshotAt: new Date(),
    },
  });

  logger.debug('x.import.snapshot_created', {
    workspaceId,
    postId: post.id,
    tweetId,
    impressions,
  });
}

/**
 * Import follower count snapshot for the X account.
 */
async function importFollowerCount(
  workspaceId: string,
  userId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/users/${encodeURIComponent(userId)}?user.fields=public_metrics`,
    {
      method: 'GET',
      headers: authHeader(accessToken),
    },
  );

  if (!response.ok) {
    logger.warn('x.import.follower_count_failed', { userId, status: response.status });
    return;
  }

  const data = await response.json() as {
    data?: { public_metrics?: { followers_count?: number } };
  };

  const followerCount = data.data?.public_metrics?.followers_count ?? 0;

  await prisma.followerSnapshot.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId,
      platform: 'x',
      followers: followerCount,
      following: 0,
      snapshotAt: new Date(),
    },
  });

  logger.info('x.import.follower_snapshot', {
    workspaceId,
    followerCount,
  });
}
