import { logger } from '@/lib/logger';
import type { PlatformAdapter, PlatformPublishResult, PublishPayload } from '@/lib/publish/types';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

interface PinterestMediaSource {
  source_type: 'image_url' | 'video_url';
  url: string;
}

interface PinterestPinRequest {
  board_id: string;
  media_source: PinterestMediaSource;
  title?: string;
  description?: string;
}

interface PinterestPinResponse {
  id: string;
  board_id?: string;
  title?: string;
  description?: string;
  media?: Record<string, unknown>;
}

function buildExternalUrl(pinId: string): string {
  return `https://www.pinterest.com/pin/${pinId}/`;
}

async function createPin(
  accessToken: string,
  boardId: string,
  requestBody: PinterestPinRequest,
): Promise<PinterestPinResponse> {
  const response = await fetch(`${PINTEREST_API_BASE}/boards/${encodeURIComponent(boardId)}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Pinterest API error ${response.status}: ${errorBody}`,
    );
  }

  return (await response.json()) as PinterestPinResponse;
}

export function createPinterestAdapter(boardId?: string): PlatformAdapter {
  const resolvedBoardId = boardId ?? process.env.PINTEREST_DEFAULT_BOARD_ID;

  return {
    platform: 'pinterest',

    async publish(
      payload: PublishPayload,
      accessToken: string,
    ): Promise<PlatformPublishResult> {
      const platformOverride = payload.platformPostData?.pinterest;
      const content = platformOverride?.content ?? payload.content;
      const mediaUrls = platformOverride?.mediaUrls ?? payload.mediaUrls;

      logger.debug('publish.pinterest.start', {
        postId: payload.postId,
        workspaceId: payload.workspaceId,
        mediaCount: mediaUrls.length,
      });

      if (!resolvedBoardId) {
        logger.error('publish.pinterest.error', {
          postId: payload.postId,
          error: 'No board ID configured',
        });
        return {
          platform: 'pinterest',
          success: false,
          error: 'No Pinterest board ID configured. Set PINTEREST_DEFAULT_BOARD_ID env var or pass boardId to createPinterestAdapter.',
        };
      }

      if (mediaUrls.length === 0) {
        logger.warn('publish.pinterest.error', {
          postId: payload.postId,
          error: 'Text-only pins are not supported on Pinterest',
        });
        return {
          platform: 'pinterest',
          success: false,
          error: 'Pinterest does not support text-only pins. At least one image or video URL is required.',
        };
      }

      const firstMediaUrl = mediaUrls[0];
      const isVideo = /\.(mp4|mov|avi|webm|m4v)(\?.*)?$/i.test(firstMediaUrl);

      const mediaSource: PinterestMediaSource = isVideo
        ? { source_type: 'video_url', url: firstMediaUrl }
        : { source_type: 'image_url', url: firstMediaUrl };

      const requestBody: PinterestPinRequest = {
        board_id: resolvedBoardId,
        media_source: mediaSource,
        description: content,
      };

      if (!isVideo) {
        requestBody.title = content.slice(0, 100) || 'Pin';
      }

      logger.debug('publish.pinterest.request', {
        postId: payload.postId,
        mediaSourceType: mediaSource.source_type,
        boardId: resolvedBoardId,
      });

      try {
        const pinResponse = await createPin(accessToken, resolvedBoardId, requestBody);

        logger.info('publish.pinterest.success', {
          postId: payload.postId,
          pinId: pinResponse.id,
        });

        return {
          platform: 'pinterest',
          success: true,
          externalId: pinResponse.id,
          externalUrl: buildExternalUrl(pinResponse.id),
        };
      } catch (error) {
        logger.error('publish.pinterest.error', {
          postId: payload.postId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          platform: 'pinterest',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown Pinterest publishing error',
        };
      }
    },
  };
}
