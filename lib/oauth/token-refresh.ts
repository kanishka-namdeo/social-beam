import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from '@/lib/oauth/crypto';
import { resolveCredentials } from '@/lib/oauth/credentials';
import { logger } from '@/lib/logger';
import { getRefreshUrl } from '@/lib/oauth/platform-registry';

const REFRESH_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h before expiry
const MAX_RETRY_ATTEMPTS = 3;

interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Refresh tokens for all platforms that support refresh_token grant.
 * Meta (Facebook/Instagram/Threads) uses a different endpoint and is handled separately.
 */

async function refreshStandardPlatform(
  platform: string,
  refreshToken: string,
  userId: string,
): Promise<RefreshResult> {
  const tokenUrl = getRefreshUrl(platform);
  if (!tokenUrl) {
    return { success: false, error: `No refresh endpoint for ${platform}` };
  }

  const credentials = await resolveCredentials(userId, platform);
  if (!credentials) {
    return { success: false, error: `No credentials for ${platform}` };
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: (data.error_description ?? data.error ?? 'Refresh failed') as string,
    };
  }

  return {
    success: true,
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) ?? refreshToken,
    expiresIn: data.expires_in as number,
  };
}

/**
 * Refresh Meta (Facebook/Instagram) tokens.
 * Uses fb_exchange_token grant to exchange long-lived tokens.
 * Meta tokens last ~60 days and must be refreshed before expiry.
 */
async function refreshMetaPlatform(
  platform: string,
  refreshToken: string,
  userId: string,
): Promise<RefreshResult> {
  const credentials = await resolveCredentials(userId, platform);
  if (!credentials) {
    return { success: false, error: `No credentials for ${platform}` };
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    fb_exchange_token: refreshToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?${params.toString()}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: (data.error?.message ?? data.error_description ?? 'Meta refresh failed') as string,
    };
  }

  return {
    success: true,
    accessToken: data.access_token as string,
    expiresIn: data.expires_in as number,
  };
}

/**
 * Refresh tokens for a single connected account.
 * Returns true if successful, false otherwise.
 */
export async function refreshAccount(accountId: string): Promise<boolean> {
  const account = await prisma.connectedAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    logger.warn('oauth.refresh.account_not_found', { accountId });
    return false;
  }

  if (account.status !== 'connected') {
    logger.debug('oauth.refresh.skip_non_connected', { accountId, status: account.status });
    return false;
  }

  if (!account.refreshToken) {
    logger.warn('oauth.refresh.no_refresh_token', { accountId, platform: account.platform });
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { status: 'expired' },
    });
    return false;
  }

  let plainRefreshToken: string;
  try {
    plainRefreshToken = decryptToken(account.refreshToken);
  } catch {
    logger.error('oauth.refresh.decrypt_failed', { accountId });
    return false;
  }

  const isMeta = account.platform === 'instagram' || account.platform === 'facebook' || account.platform === 'threads';
  const refreshFn = isMeta ? refreshMetaPlatform : refreshStandardPlatform;

  let attempt = 0;
  let result: RefreshResult | undefined;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    result = await refreshFn(account.platform, plainRefreshToken, account.workspaceId);
    attempt++;

    if (result.success && result.accessToken) {
      break;
    }

    logger.warn('oauth.refresh.retry', {
      accountId,
      platform: account.platform,
      attempt,
      error: result.error,
    });

    if (attempt >= MAX_RETRY_ATTEMPTS) {
      await prisma.connectedAccount.update({
        where: { id: accountId },
        data: { status: 'expired' },
      });
      return false;
    }

    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
  }

  if (!result?.success || !result.accessToken) {
    return false;
  }

  const newTokenExpiry = result.expiresIn
    ? new Date(Date.now() + result.expiresIn * 1000)
    : account.tokenExpiry;

  await prisma.connectedAccount.update({
    where: { id: accountId },
    data: {
      accessToken: encryptToken(result.accessToken),
      refreshToken: result.refreshToken ? encryptToken(result.refreshToken) : account.refreshToken,
      tokenExpiry: newTokenExpiry,
      lastRefreshAt: new Date(),
      status: 'connected',
    },
  });

  logger.info('oauth.refresh.success', {
    accountId,
    platform: account.platform,
  });

  return true;
}

/**
 * Find all accounts due for refresh within the given window.
 */
export async function getAccountsDueForRefresh(windowMs: number = REFRESH_REFRESH_WINDOW_MS) {
  const now = new Date();
  const refreshThreshold = new Date(now.getTime() + windowMs);

  return prisma.connectedAccount.findMany({
    where: {
      status: 'connected',
      OR: [
        // Token expiring within window
        {
          tokenExpiry: {
            lte: refreshThreshold,
          },
        },
        // Never refreshed but has a refresh token
        {
          tokenExpiry: null,
          refreshToken: { not: '' },
        },
      ],
    },
    select: {
      id: true,
      platform: true,
      workspaceId: true,
      tokenExpiry: true,
      refreshToken: true,
    },
  });
}

/**
 * Refresh all accounts due for token renewal.
 * Returns summary of success/failure counts.
 */
export async function refreshAllDueAccounts(): Promise<{ total: number; succeeded: number; failed: number }> {
  const accounts = await getAccountsDueForRefresh();

  if (accounts.length === 0) {
    logger.info('oauth.refresh.no_accounts_due', { message: 'No accounts need refresh' });
    return { total: 0, succeeded: 0, failed: 0 };
  }

  logger.info('oauth.refresh.start_batch', { count: accounts.length });

  let succeeded = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const ok = await refreshAccount(account.id);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (err) {
      logger.error('oauth.refresh.unexpected_error', {
        accountId: account.id,
        error: String(err),
      });
      failed++;
    }
  }

  logger.info('oauth.refresh.batch_complete', { total: accounts.length, succeeded, failed });
  return { total: accounts.length, succeeded, failed };
}
