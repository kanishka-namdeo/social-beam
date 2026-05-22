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

  const specificContent: Record<string, unknown> = {
    shareCommentary: { text },
    shareMediaCategory: mediaCategory,
  };

  if (mediaUrn) {
    specificContent.media = [
      {
        status: 'READY',
        description: { text: '' },
        media: mediaUrn,
        title: { text: '' },
      },
    ];
  }

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': specificContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await fetch(`${BASE_URL}/rest/ugcPosts`, {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Post creation failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const shareUrn = data?.id as string | undefined;
  if (!shareUrn) {
    throw new Error('Post creation succeeded but no share URN returned');
  }

  logger.info('linkedin.post.create.success', { shareUrn });
  return shareUrn;
}

function extractShareId(shareUrn: string): string {
  // URN format: urn:li:share:123456789
  const parts = shareUrn.split(':');
  return parts[parts.length - 1];
}

function buildExternalUrl(shareUrn: string): string {
  const shareId = extractShareId(shareUrn);
  return `https://www.linkedin.com/feed/update/urn:li:share:${shareId}`;
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

        let shareUrn: string;

        if (mediaUrls.length > 0) {
          const firstMediaUrl = mediaUrls[0];
          const isVideo = /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(firstMediaUrl);

          if (isVideo) {
            const videoUrn = await uploadVideo(firstMediaUrl, accessToken);
            shareUrn = await createPost(authorUrn, text, accessToken, 'VIDEO', videoUrn);
          } else {
            // Default to image for image-like extensions or unknown
            const imageUrn = await uploadImage(firstMediaUrl, accessToken);
            shareUrn = await createPost(authorUrn, text, accessToken, 'IMAGE', imageUrn);
          }
        } else {
          shareUrn = await createPost(authorUrn, text, accessToken, 'NONE');
        }

        const result: PlatformPublishResult = {
          platform: 'linkedin',
          success: true,
          externalId: extractShareId(shareUrn),
          externalUrl: buildExternalUrl(shareUrn),
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
