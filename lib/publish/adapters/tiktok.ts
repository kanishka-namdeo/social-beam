import { logger } from '@/lib/logger';
import { PlatformPublishResult, PublishPayload, PlatformAdapter } from '@/lib/publish/types';

const TIKTOK_BASE_URL = 'https://open.tiktokapis.com/v2';
const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 3000;

type PrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'FOLLOWER_OF_CREATOR'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'SELF_ONLY';

interface TikTokPublishInitRequest {
  post_info: {
    title: string;
    description: string;
    privacy_level: PrivacyLevel;
    disable_duet: boolean;
    disable_comment: boolean;
    disable_stitch: boolean;
    brand_content_toggle: boolean;
    brand_organic_toggle: boolean;
  };
  source_info: {
    source: 'PULL_FROM_URL';
    video_url: string;
  };
}

interface TikTokPublishInitResponse {
  data: {
    publish_id: string;
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

interface TikTokPublishStatusResponse {
  data: {
    publish_id: string;
    status:
      | 'PROCESSING_UPLOAD'
      | 'PROCESSING_PREPARE_DATA'
      | 'PROCESSING_IN_PROGRESS'
      | 'PUBLISH_COMPLETE'
      | 'FAILED';
    publicaly_available_post_id?: string;
    fail_reason?: string;
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

async function tiktokApiRequest<T>(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<T> {
  const url = `${TIKTOK_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `TikTok API error ${response.status}: ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function initPublish(
  accessToken: string,
  description: string,
  videoUrl: string,
  privacyLevel: PrivacyLevel,
): Promise<string> {
  const requestBody: TikTokPublishInitRequest = {
    post_info: {
      title: '',
      description,
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl,
    },
  };

  const response = await tiktokApiRequest<TikTokPublishInitResponse>(
    '/v2/post/publish/video/init/',
    'POST',
    accessToken,
    requestBody,
  );

  if (response.error) {
    throw new Error(
      `TikTok publish init failed: ${response.error.code} - ${response.error.message}`,
    );
  }

  return response.data.publish_id;
}

async function pollPublishStatus(
  accessToken: string,
  publishId: string,
): Promise<{ shareId: string; status: string }> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await tiktokApiRequest<TikTokPublishStatusResponse>(
      `/v2/post/publish/status/fetch/?publish_id=${publishId}`,
      'GET',
      accessToken,
    );

    if (response.error) {
      throw new Error(
        `TikTok status check failed: ${response.error.code} - ${response.error.message}`,
      );
    }

    const { status, publicaly_available_post_id, fail_reason } = response.data;

    if (status === 'PUBLISH_COMPLETE') {
      return {
        shareId: publicaly_available_post_id ?? publishId,
        status,
      };
    }

    if (status === 'FAILED') {
      throw new Error(
        `TikTok publish failed: ${fail_reason ?? 'Unknown error'}`,
      );
    }

    logger.debug('publish.tiktok.poll', {
      publishId,
      attempt: attempt + 1,
      status,
    });
  }

  throw new Error(
    `TikTok publish timed out after ${MAX_POLLS} polls`,
  );
}

export function createTiktokAdapter(
  privacyLevel: PrivacyLevel = 'PUBLIC_TO_EVERYONE',
): PlatformAdapter {
  return {
    platform: 'tiktok',

    async publish(
      payload: PublishPayload,
      accessToken: string,
    ): Promise<PlatformPublishResult> {
      const log = logger.child({
        postId: payload.postId,
        platform: 'tiktok',
      });

      try {
        if (!payload.mediaUrls || payload.mediaUrls.length === 0) {
          log.warn('publish.tiktok.no_media', {
            postId: payload.postId,
          });
          return {
            platform: 'tiktok',
            success: false,
            error:
              'TikTok requires video content. Text-only posts are not supported.',
          };
        }

        const content =
          payload.platformPostData?.tiktok?.content ?? payload.content;
        const videoUrl =
          payload.platformPostData?.tiktok?.mediaUrls?.[0] ??
          payload.mediaUrls[0];

        log.info('publish.tiktok.init', {
          postId: payload.postId,
          contentLength: content.length,
          videoUrl,
        });

        const publishId = await initPublish(
          accessToken,
          content,
          videoUrl,
          privacyLevel,
        );

        log.info('publish.tiktok.polling', {
          postId: payload.postId,
          publishId,
        });

        const { shareId } = await pollPublishStatus(
          accessToken,
          publishId,
        );

        const externalUrl = `https://www.tiktok.com/@user/video/${shareId}`;

        log.info('publish.tiktok.success', {
          postId: payload.postId,
          externalUrl,
          shareId,
        });

        return {
          platform: 'tiktok',
          success: true,
          externalId: shareId,
          externalUrl,
        };
      } catch (error) {
        log.error('publish.tiktok.error', {
          postId: payload.postId,
          error: String(error),
        });
        return {
          platform: 'tiktok',
          success: false,
          error: String(error),
        };
      }
    },
  };
}
