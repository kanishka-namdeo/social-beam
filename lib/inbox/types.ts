import type { PlatformName } from '@/lib/publish/types';

export type { PlatformName } from '@/lib/publish/types';

// Re-export EngagementType from Prisma
import type { EngagementItem, EngagementType, EngagementStatus } from '@/app/generated/prisma';
export type { EngagementItem, EngagementType, EngagementStatus };

export interface RawComment {
  platformItemId: string;
  authorName: string;
  authorAvatar?: string;
  authorProfileUrl?: string | null;
  authorHandle?: string | null;
  content: string;
  parentContent?: string;
  parentId?: string;
  platformUrl?: string;
  createdAt: Date;
}

export interface RawMention {
  platformItemId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentContent?: string;
  platformUrl?: string;
  createdAt: Date;
}

export interface RawDM {
  platformItemId: string;
  conversationId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  platformUrl?: string;
  createdAt: Date;
  expiresAt?: Date; // For 24-hour window platforms
}

export interface EngagementAdapter {
  platform: PlatformName;
  fetchComments(since?: Date): Promise<RawComment[]>;
  fetchMentions(since?: Date): Promise<RawMention[]>;
  fetchDMs(since?: Date): Promise<RawDM[]>;
  replyToComment(platformItemId: string, text: string): Promise<{ success: boolean; error?: string }>;
  replyToDM(conversationId: string, text: string): Promise<{ success: boolean; error?: string }>;
}
