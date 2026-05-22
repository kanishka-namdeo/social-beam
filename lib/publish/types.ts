export type PlatformName = 'instagram' | 'facebook' | 'x' | 'linkedin' | 'tiktok' | 'pinterest';

export interface PlatformPublishResult {
  platform: PlatformName;
  success: boolean;
  externalId?: string; // The post ID on the platform
  externalUrl?: string; // URL to view the post on the platform
  error?: string; // Error message if failed
}

export interface PublishPayload {
  postId: string;
  workspaceId: string;
  content: string; // The text content to publish
  mediaUrls: string[]; // Array of media URLs
  platformPostData?: Record<PlatformName, { content?: string; mediaUrls?: string[] }>; // Platform-specific overrides
}

export interface PlatformAdapter {
  platform: PlatformName;
  publish(payload: PublishPayload, accessToken: string): Promise<PlatformPublishResult>;
}

export interface QueuedPost {
  id: string;
  workspaceId: string;
  scheduledAt: Date | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  content: { text?: string; media?: Array<{ type: string; url: string }> };
  platforms: Array<{
    id: string;
    platform: PlatformName;
    content: string;
    mediaUrls: string[];
    status: string;
    error: string | null;
  }>;
}

export interface DuePost {
  id: string;
  workspaceId: string;
  scheduledAt: Date;
  platforms: Array<{
    platformId: string;
    platform: PlatformName;
    content: string;
    mediaUrls: string[];
  }>;
}
