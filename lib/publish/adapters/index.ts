import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/oauth/crypto';
import { PlatformAdapter, PlatformName } from '@/lib/publish/types';

import { createInstagramAdapter } from './instagram';
import { createFacebookAdapter } from './facebook';
import { createXAdapter } from './x';
import { createLinkedinAdapter } from './linkedin';
import { createTiktokAdapter } from './tiktok';
import { createPinterestAdapter } from './pinterest';

export async function createPlatformAdapter(
  platform: PlatformName,
  workspaceId: string,
): Promise<PlatformAdapter> {
  logger.debug('adapter.platform.lookup', { platform, workspaceId });

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_platform: { workspaceId, platform } },
  });

  if (!account) {
    logger.error('adapter.platform.not_found', { platform, workspaceId });
    throw new Error(`No connected account found for platform: ${platform}`);
  }

  if (account.status !== 'connected') {
    logger.warn('adapter.platform.not_connected', { platform, workspaceId, status: account.status });
    throw new Error(`Account not connected: ${platform} (status: ${account.status})`);
  }

  if (account.tokenExpiry && account.tokenExpiry < new Date()) {
    logger.warn('adapter.platform.token_expired', { platform, workspaceId });
    throw new Error(`Token expired for platform: ${platform}`);
  }

  // Validate the token is decryptable before proceeding
  decryptToken(account.accessToken);

  logger.debug('adapter.platform.created', { platform, workspaceId });

  switch (platform) {
    case 'instagram':
      return createInstagramAdapter(account.platformUserId);
    case 'facebook':
      return createFacebookAdapter(account.platformUserId);
    case 'x':
      return createXAdapter();
    case 'linkedin':
      return createLinkedinAdapter(account.platformUserId);
    case 'tiktok':
      return createTiktokAdapter();
    case 'pinterest':
      return createPinterestAdapter();
    default: {
      const _exhaustiveCheck: never = platform;
      throw new Error(`Unknown platform: ${_exhaustiveCheck}`);
    }
  }
}

export async function getConnectedPlatforms(
  workspaceId: string,
): Promise<PlatformName[]> {
  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId, status: 'connected' },
    select: { platform: true },
  });
  return accounts.map((a) => a.platform as PlatformName);
}

export {
  createInstagramAdapter,
  createFacebookAdapter,
  createXAdapter,
  createLinkedinAdapter,
  createTiktokAdapter,
  createPinterestAdapter,
};
