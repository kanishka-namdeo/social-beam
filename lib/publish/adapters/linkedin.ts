import { logger } from '@/lib/logger';
import { PlatformAdapter, PlatformPublishResult, PublishPayload } from '@/lib/publish/types';

const BASE_URL = 'https://api.linkedin.com/v2';

const LINKEDIN_HEADERS = {
  'LinkedIn-Version': '202501',
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
};

function authHeader(accessToken: string): Record<string, string> {
  return { ...LINKEDIN_HEADERS, Authorization: `Bearer ${accessToken}` };
}

async function uploadImage(imageUrl: string, accessToken: string): Promise<string> {
  logger.debug('linkedin.image.upload.start', { imageUrl });

  const response = await fetch(`${BASE_URL}/rest/images`, {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify({
      downloadUrl: imageUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Image upload failed (${response.status}): ${body}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const imageUrn = data?.image as string | undefined;
  if (!imageUrn) {
    throw new Error('Image upload succeeded but no URN returned');
  }

  logger.info('linkedin.image.upload.success', { imageUrn });
  return imageUrn;
}

async function uploadVideo(videoUrl: string, accessToken: string): Promise<string> {
  logger.debug('linkedin.video.upload.start', { videoUrl });

  const response = await fetch(`${BASE_URL}/rest/videos`, {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify({
      downloadUrl: videoUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Video upload failed (${response.status}): ${body}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const videoUrn = data?.video as string | undefined;
  if (!videoUrn) {
    throw new Error('Video upload succeeded but no URN returned');
  }

  logger.info('linkedin.video.upload.success', { videoUrn });
  return videoUrn;
}

async function createPost(
  authorUrn: string,
  text: string,
  accessToken: string,
  mediaCategory: 'NONE' | 'IMAGE' | 'VIDEO',
  mediaUrn?: string,
): Promise<string> {
  logger.debug('linkedin.post.create.start', { authorUrn, mediaCategory });

  // Build the new Posts API payload
  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  // Add media content if provided
  if (mediaUrn && mediaCategory !== 'NONE') {
    if (mediaCategory === 'IMAGE') {
      body.content = {
        media: {
          id: mediaUrn,
        },
      };
    } else if (mediaCategory === 'VIDEO') {
      body.content = {
        media: {
          id: mediaUrn,
        },
      };
    }
  }

  const response = await fetch(`${BASE_URL}/rest/posts`, {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Post creation failed (${response.status}): ${errorBody}`);
  }

  // The post ID is returned in the x-restli-id header
  const postUrn = response.headers.get('x-restli-id');
  if (!postUrn) {
    // Fallback: try to parse from response body
    const data = await response.json() as Record<string, unknown>;
    const id = data?.id as string | undefined;
    if (!id) {
      throw new Error('Post creation succeeded but no post URN returned');
    }
    logger.info('linkedin.post.create.success', { postUrn: id });
    return id;
  }

  logger.info('linkedin.post.create.success', { postUrn });
  return postUrn;
}

function extractPostId(postUrn: string): string {
  // URN format: urn:li:share:123456789 or urn:li:ugcPost:123456789
  const parts = postUrn.split(':');
  return parts[parts.length - 1];
}

function buildExternalUrl(postUrn: string): string {
  // LinkedIn post URLs use the share URN format
  return `https://www.linkedin.com/feed/update/${postUrn}`;
}

export function createLinkedinAdapter(personId: string): PlatformAdapter {
  const authorUrn = `urn:li:person:${personId}`;

  return {
    platform: 'linkedin',
    async publish(payload: PublishPayload, accessToken: string): Promise<PlatformPublishResult> {
      const log = logger.child({ platform: 'linkedin', postId: payload.postId, personId });
      log.info('linkedin.publish.start', { mediaCount: payload.mediaUrls.length });

      try {
        // Determine content override for LinkedIn if provided
        const platformOverride = payload.platformPostData?.linkedin;
        const text = platformOverride?.content ?? payload.content;
        const mediaUrls = platformOverride?.mediaUrls ?? payload.mediaUrls;

        let postUrn: string;

        if (mediaUrls.length > 0) {
          const firstMediaUrl = mediaUrls[0];
          const isVideo = /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(firstMediaUrl);

          if (isVideo) {
            const videoUrn = await uploadVideo(firstMediaUrl, accessToken);
            postUrn = await createPost(authorUrn, text, accessToken, 'VIDEO', videoUrn);
          } else {
            // Default to image for image-like extensions or unknown
            const imageUrn = await uploadImage(firstMediaUrl, accessToken);
            postUrn = await createPost(authorUrn, text, accessToken, 'IMAGE', imageUrn);
          }
        } else {
          postUrn = await createPost(authorUrn, text, accessToken, 'NONE');
        }

        const result: PlatformPublishResult = {
          platform: 'linkedin',
          success: true,
          externalId: extractPostId(postUrn),
          externalUrl: buildExternalUrl(postUrn),
        };

        log.info('linkedin.publish.success', { externalId: result.externalId });
        return result;
      } catch (error) {
        log.error('linkedin.publish.error', { error: String(error) });
        return {
          platform: 'linkedin',
          success: false,
          error: String(error),
        };
      }
    },
  };
}
