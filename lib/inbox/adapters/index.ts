import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { EngagementAdapter } from '@/lib/inbox/types';
import type { PlatformName } from '@/lib/inbox/types';

import { createInstagramInboxAdapter, createInstagramHybridAdapter } from './instagram-hybrid';
import { createFacebookInboxAdapter, createFacebookHybridAdapter } from './facebook-hybrid';
import { createXInboxAdapter, createXHybridAdapter } from './x-hybrid';
import { createLinkedinScraperAdapter } from './linkedin-scraper-adapter';
import { createTiktokInboxAdapter, createTikTokHybridAdapter } from './tiktok-hybrid';
import { createPinterestHybridAdapter } from './pinterest-hybrid';

export async function createInboxAdapter(
  platform: PlatformName,
  workspaceId: string,
): Promise<EngagementAdapter | null> {
  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_platform: { workspaceId, platform } },
  });

  if (!account) {
    logger.warn('inbox.adapter.not_found', { platform, workspaceId });
    return null;
  }

  if (account.status !== 'connected') {
    logger.warn('inbox.adapter.not_connected', { platform, workspaceId, status: account.status });
    return null;
  }

  if (account.tokenExpiry && account.tokenExpiry < new Date()) {
    logger.warn('inbox.adapter.token_expired', { platform, workspaceId });
    return null;
  }

  const token = account.accessToken;

  switch (platform) {
    case 'instagram':
      return createInstagramHybridAdapter(account.platformUserId, token);
    case 'facebook':
      return createFacebookHybridAdapter(account.platformUserId, token);
    case 'x':
      return createXHybridAdapter(token);
    case 'linkedin':
      return createLinkedinScraperAdapter();
    case 'tiktok':
      return createTikTokHybridAdapter(token);
    case 'pinterest':
      return createPinterestHybridAdapter();
    default: {
      const _exhaustiveCheck: never = platform;
      logger.error('inbox.adapter.unknown_platform', { platform: _exhaustiveCheck });
      return null;
    }
  }
}

export {
  createInstagramInboxAdapter,
  createFacebookInboxAdapter,
  createXInboxAdapter,
  createTiktokInboxAdapter,
};
