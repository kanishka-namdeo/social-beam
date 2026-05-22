import { logger } from '@/lib/logger';
import type { PlatformAdapter, PlatformPublishResult, PublishPayload } from '@/lib/publish/types';

const INSTAGRAM_BASE_URL = 'https://graph.facebook.com/v22.0';

/** Maximum number of items allowed in an Instagram carousel. */
const MAX_CAROUSEL_ITEMS = 10;

/** Detect image URLs by extension. */
function isImageUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ext !== undefined && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext);
}

/** Detect video URLs by extension. */
function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ext !== undefined && ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(ext);
}

/** Make an authenticated POST request to the Instagram Graph API. */
async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const url = `${INSTAGRAM_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message = (data.error as Record<string, unknown>)?.message ?? JSON.stringify(data);
    throw new Error(`Instagram API error (${res.status}): ${message}`);
  }

  return data as T;
}

/** Create a single media container and return its creation_id. */
async function createContainer(
  igAccountId: string,
  mediaUrl: string,
  caption: string,
  isCarouselItem: boolean,
  accessToken: string,
): Promise<string> {
  const body: Record<string, unknown> = { caption };

  if (isVideoUrl(mediaUrl)) {
    body.video_url = mediaUrl;
    body.media_type = 'VIDEO';
  } else {
    body.image_url = mediaUrl;
  }

  if (isCarouselItem) {
    body.is_carousel_item = true;
  }

  const result = await apiPost<{ id: string }>(
    `/${igAccountId}/media`,
    body,
    accessToken,
  );

  return result.id;
}

/** Publish a previously created container (or carousel) and return the post ID. */
async function publishContainer(
  igAccountId: string,
  creationId: string,
  accessToken: string,
  children?: string[],
): Promise<string> {
  const body: Record<string, unknown> = { creation_id: creationId };
  if (children && children.length > 0) {
    body.children = children.join(',');
  }

  const result = await apiPost<{ id: string }>(
    `/${igAccountId}/media_publish`,
    body,
    accessToken,
  );

  return result.id;
}

/** Wait for a container to finish processing (polling). */
async function waitForContainer(
  igAccountId: string,
  containerId: string,
  accessToken: string,
  maxAttempts = 30,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = `${INSTAGRAM_BASE_URL}/${containerId}`;
    const res = await fetch(`${url}?fields=status_code&access_token=${accessToken}`);
    const data = (await res.json()) as { status_code?: string };

    if (data.status_code === 'FINISHED') {
      return;
    }
    if (data.status_code === 'ERROR') {
      throw new Error(`Container ${containerId} failed processing`);
    }

    // Exponential backoff: 1s, 2s, 3s, ...
    await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 1000, 5000)));
  }

  throw new Error(`Container ${containerId} did not finish processing after ${maxAttempts} attempts`);
}

export function createInstagramAdapter(igAccountId: string): PlatformAdapter {
  return {
    platform: 'instagram' as const,

    async publish(payload: PublishPayload, accessToken: string): Promise<PlatformPublishResult> {
      const platformOverride = payload.platformPostData?.instagram;
      const content = platformOverride?.content ?? payload.content;
      const mediaUrls = platformOverride?.mediaUrls ?? payload.mediaUrls;

      const log = logger.child({
        platform: 'instagram',
        igAccountId,
        postId: payload.postId,
      });

      // Instagram requires at least one media URL — text-only posts are not supported.
      if (!mediaUrls || mediaUrls.length === 0) {
        const errorMsg = 'Instagram does not support text-only posts. At least one media URL is required.';
        log.warn('publish.failed', { error: errorMsg });
        return {
          platform: 'instagram',
          success: false,
          error: errorMsg,
        };
      }

      try {
        const imageUrls = mediaUrls.filter(isImageUrl);
        const videoUrls = mediaUrls.filter(isVideoUrl);

        // Mixed image + video is only supported via carousel.
        // A single video is published as a regular video post.
        // Multiple images are published as a carousel.
        // Multiple videos are published as a carousel.

        if (videoUrls.length > 0 && imageUrls.length > 0) {
          // Mixed content: publish everything as a carousel.
          log.info('publish.carousel_mixed_content', {
            imageCount: imageUrls.length,
            videoCount: videoUrls.length,
          });
          return publishCarousel(igAccountId, mediaUrls, content, accessToken, log);
        }

        if (videoUrls.length === 1 && imageUrls.length === 0) {
          // Single video post.
          log.info('publish.video');
          return publishSingleMedia(igAccountId, videoUrls[0], content, accessToken, log);
        }

        if (imageUrls.length === 1 && videoUrls.length === 0) {
          // Single image post.
          log.info('publish.image');
          return publishSingleMedia(igAccountId, imageUrls[0], content, accessToken, log);
        }

        if (imageUrls.length > 1) {
          // Multiple images: carousel.
          log.info('publish.carousel_images', { count: imageUrls.length });
          return publishCarousel(igAccountId, imageUrls, content, accessToken, log);
        }

        if (videoUrls.length > 1) {
          // Multiple videos: carousel.
          log.info('publish.carousel_videos', { count: videoUrls.length });
          return publishCarousel(igAccountId, videoUrls, content, accessToken, log);
        }

        // Should not reach here, but handle defensively.
        const errorMsg = 'No supported media found for Instagram publish.';
        log.warn('publish.failed', { error: errorMsg });
        return { platform: 'instagram', success: false, error: errorMsg };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        log.error('publish.failed', { error: errorMessage });
        return {
          platform: 'instagram',
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

/** Publish a single image or video post (non-carousel). */
async function publishSingleMedia(
  igAccountId: string,
  mediaUrl: string,
  caption: string,
  accessToken: string,
  log: ReturnType<typeof logger.child>,
): Promise<PlatformPublishResult> {
  log.debug('publish.container.create', { mediaUrl });

  const creationId = await createContainer(igAccountId, mediaUrl, caption, false, accessToken);
  log.debug('publish.container.created', { creationId });

  // Wait for the container to finish processing before publishing.
  log.debug('publish.container.waiting', { creationId });
  await waitForContainer(igAccountId, creationId, accessToken);
  log.debug('publish.container.ready', { creationId });

  const publishedId = await publishContainer(igAccountId, creationId, accessToken);
  log.info('publish.success', { publishedId });

  return {
    platform: 'instagram',
    success: true,
    externalId: publishedId,
    externalUrl: `https://www.instagram.com/p/${publishedId}/`,
  };
}

/** Publish a carousel post (multiple images and/or videos). */
async function publishCarousel(
  igAccountId: string,
  mediaUrls: string[],
  caption: string,
  accessToken: string,
  log: ReturnType<typeof logger.child>,
): Promise<PlatformPublishResult> {
  if (mediaUrls.length > MAX_CAROUSEL_ITEMS) {
    const errorMsg = `Instagram carousel supports at most ${MAX_CAROUSEL_ITEMS} items, got ${mediaUrls.length}.`;
    log.warn('publish.failed', { error: errorMsg, itemCount: mediaUrls.length });
    return { platform: 'instagram', success: false, error: errorMsg };
  }

  if (mediaUrls.length < 2) {
    // Delegate to single-media publish if called with only one item.
    return publishSingleMedia(igAccountId, mediaUrls[0], caption, accessToken, log);
  }

  // Step 1: Create all containers as carousel items.
  log.debug('publish.carousel.creating_containers', { count: mediaUrls.length });

  const creationIds: string[] = [];
  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i];
    log.debug('publish.carousel.container.create', { index: i, url });

    const creationId = await createContainer(igAccountId, url, '', true, accessToken);
    log.debug('publish.carousel.container.created', { index: i, creationId });
    creationIds.push(creationId);
  }

  // Step 2: Wait for all containers to finish processing.
  log.debug('publish.carousel.waiting');
  for (let i = 0; i < creationIds.length; i++) {
    await waitForContainer(igAccountId, creationIds[i], accessToken);
    log.debug('publish.carousel.container.ready', { index: i, creationId: creationIds[i] });
  }

  // Step 3: Publish the carousel with all children.
  log.debug('publish.carousel.publish', { children: creationIds });
  const publishedId = await publishContainer(
    igAccountId,
    creationIds[0],
    accessToken,
    creationIds.slice(1),
  );
  log.info('publish.carousel.success', { publishedId, itemCount: creationIds.length });

  return {
    platform: 'instagram',
    success: true,
    externalId: publishedId,
    externalUrl: `https://www.instagram.com/p/${publishedId}/`,
  };
}
