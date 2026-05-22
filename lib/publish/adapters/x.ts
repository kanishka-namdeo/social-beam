import { logger } from '@/lib/logger';
import type { PlatformAdapter, PlatformPublishResult, PublishPayload } from '@/lib/publish/types';

const X_API_BASE = 'https://api.twitter.com/2';
const X_UPLOAD_BASE = 'https://upload.twitter.com/1.1';
const MAX_TWEET_LENGTH = 280;

async function uploadMedia(
  mediaUrl: string,
  accessToken: string,
): Promise<string> {
  logger.debug('x.upload_media.start', { mediaUrl });

  const uploadUrl = `${X_UPLOAD_BASE}/media/upload.json`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ media_url: mediaUrl }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('x.upload_media.failed', {
      mediaUrl,
      status: response.status,
      error: errorBody,
    });
    throw new Error(
      `Media upload failed with status ${response.status}: ${errorBody}`,
    );
  }

  const result = (await response.json()) as { media_id_string: string };
  logger.info('x.upload_media.success', {
    mediaUrl,
    mediaId: result.media_id_string,
  });
  return result.media_id_string;
}

async function createTweet(
  content: string,
  accessToken: string,
  options?: {
    mediaIds?: string[];
    replyToTweetId?: string;
  },
): Promise<{ id: string; text: string }> {
  logger.debug('x.create_tweet.start', {
    contentLength: content.length,
    hasMedia: !!options?.mediaIds?.length,
    isReply: !!options?.replyToTweetId,
  });

  const body: Record<string, unknown> = { text: content };

  if (options?.mediaIds && options.mediaIds.length > 0) {
    body.media = { media_ids: options.mediaIds };
  }

  if (options?.replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('x.create_tweet.failed', {
      status: response.status,
      error: errorBody,
    });
    throw new Error(
      `Tweet creation failed with status ${response.status}: ${errorBody}`,
    );
  }

  const result = (await response.json()) as {
    data: { id: string; text: string };
  };
  logger.info('x.create_tweet.success', { tweetId: result.data.id });
  return result.data;
}

export function createXAdapter(): PlatformAdapter {
  return {
    platform: 'x',

    async publish(
      payload: PublishPayload,
      accessToken: string,
    ): Promise<PlatformPublishResult> {
      const platformContent = payload.platformPostData?.x?.content ?? payload.content;
      const platformMediaUrls = payload.platformPostData?.x?.mediaUrls ?? payload.mediaUrls;

      if (!platformContent || platformContent.trim().length === 0) {
        logger.warn('x.publish.empty_content', { postId: payload.postId });
        return {
          platform: 'x',
          success: false,
          error: 'Tweet content cannot be empty',
        };
      }

      if (platformContent.length > MAX_TWEET_LENGTH) {
        logger.warn('x.publish.too_long', {
          postId: payload.postId,
          length: platformContent.length,
          max: MAX_TWEET_LENGTH,
        });
        return {
          platform: 'x',
          success: false,
          error: `Tweet exceeds ${MAX_TWEET_LENGTH} character limit (${platformContent.length} characters)`,
        };
      }

      try {
        let mediaIds: string[] | undefined;

        if (platformMediaUrls && platformMediaUrls.length > 0) {
          logger.info('x.publish.uploading_media', {
            postId: payload.postId,
            mediaCount: platformMediaUrls.length,
          });

          mediaIds = [];
          for (const mediaUrl of platformMediaUrls) {
            const mediaId = await uploadMedia(mediaUrl, accessToken);
            mediaIds.push(mediaId);
          }
        }

        const tweet = await createTweet(platformContent, accessToken, {
          mediaIds,
        });

        const externalUrl = `https://x.com/user/status/${tweet.id}`;
        logger.info('x.publish.success', {
          postId: payload.postId,
          tweetId: tweet.id,
          externalUrl,
        });

        return {
          platform: 'x',
          success: true,
          externalId: tweet.id,
          externalUrl,
        };
      } catch (error) {
        logger.error('x.publish.error', {
          postId: payload.postId,
          error: String(error),
        });
        return {
          platform: 'x',
          success: false,
          error: String(error),
        };
      }
    },
  };
}
