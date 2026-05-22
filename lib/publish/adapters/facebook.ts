import { logger } from '@/lib/logger';
import { PlatformAdapter, PlatformPublishResult, PublishPayload, PlatformName } from '@/lib/publish/types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v22.0';

export class FacebookAdapter implements PlatformAdapter {
  public readonly platform: PlatformName = 'facebook';

  constructor(private pageId: string) {}

  async publish(payload: PublishPayload, accessToken: string): Promise<PlatformPublishResult> {
    const content = payload.platformPostData?.facebook?.content ?? payload.content;
    const mediaUrls = payload.platformPostData?.facebook?.mediaUrls ?? payload.mediaUrls;

    logger.info('publish.facebook.start', {
      postId: payload.postId,
      pageId: this.pageId,
      hasMedia: mediaUrls.length > 0,
      mediaCount: mediaUrls.length,
    });

    try {
      if (mediaUrls.length > 0) {
        const firstMediaUrl = mediaUrls[0];
        const mediaType = this.inferMediaType(firstMediaUrl);

        if (mediaType === 'image') {
          return this.publishPhoto(content, firstMediaUrl, accessToken, payload.postId);
        }
        if (mediaType === 'video') {
          return this.publishVideo(content, firstMediaUrl, accessToken, payload.postId);
        }
      }

      return this.publishText(content, accessToken, payload.postId);
    } catch (error) {
      logger.error('publish.facebook.error', {
        postId: payload.postId,
        pageId: this.pageId,
        error: String(error),
      });

      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async publishText(
    content: string,
    accessToken: string,
    postId: string,
  ): Promise<PlatformPublishResult> {
    logger.debug('publish.facebook.text_publishing', { postId, pageId: this.pageId });

    const url = `${GRAPH_API_BASE}/${this.pageId}/feed`;
    const body = new URLSearchParams({
      message: content,
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('publish.facebook.text_failed', {
        postId,
        pageId: this.pageId,
        status: response.status,
        error: data,
      });
      throw new Error(
        data?.error?.message ?? `Facebook text publish failed (${response.status})`,
      );
    }

    const externalId = data.id as string;
    const externalUrl = this.buildPostUrl(externalId);

    logger.info('publish.facebook.text_success', { postId, externalId });
    return { platform: 'facebook', success: true, externalId, externalUrl };
  }

  private async publishPhoto(
    caption: string,
    imageUrl: string,
    accessToken: string,
    postId: string,
  ): Promise<PlatformPublishResult> {
    logger.debug('publish.facebook.photo_publishing', { postId, pageId: this.pageId });

    const url = `${GRAPH_API_BASE}/${this.pageId}/photos`;
    const body = new URLSearchParams({
      url: imageUrl,
      message: caption,
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('publish.facebook.photo_failed', {
        postId,
        pageId: this.pageId,
        status: response.status,
        error: data,
      });
      throw new Error(
        data?.error?.message ?? `Facebook photo publish failed (${response.status})`,
      );
    }

    const externalId = data.post_id ?? data.id;
    const externalUrl = this.buildPostUrl(externalId);

    logger.info('publish.facebook.photo_success', { postId, externalId });
    return { platform: 'facebook', success: true, externalId, externalUrl };
  }

  private async publishVideo(
    description: string,
    videoUrl: string,
    accessToken: string,
    postId: string,
  ): Promise<PlatformPublishResult> {
    logger.debug('publish.facebook.video_publishing', { postId, pageId: this.pageId });

    const url = `${GRAPH_API_BASE}/${this.pageId}/videos`;
    const body = new URLSearchParams({
      file_url: videoUrl,
      description,
      access_token: accessToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('publish.facebook.video_failed', {
        postId,
        pageId: this.pageId,
        status: response.status,
        error: data,
      });
      throw new Error(
        data?.error?.message ?? `Facebook video publish failed (${response.status})`,
      );
    }

    const externalId = data.id as string;
    const externalUrl = this.buildPostUrl(externalId);

    logger.info('publish.facebook.video_success', { postId, externalId });
    return { platform: 'facebook', success: true, externalId, externalUrl };
  }

  private inferMediaType(url: string): 'image' | 'video' | null {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext ?? '')) return 'video';
    return null;
  }

  private buildPostUrl(postId: string): string {
    return `https://www.facebook.com/${this.pageId}/posts/${postId}`;
  }
}

export function createFacebookAdapter(pageId: string): PlatformAdapter {
  return new FacebookAdapter(pageId);
}
