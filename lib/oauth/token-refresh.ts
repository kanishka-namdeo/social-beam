import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from '@/lib/oauth/crypto';
import { resolveCredentials } from '@/lib/oauth/credentials';
import { logger } from '@/lib/logger';
import { getRefreshUrl } from '@/lib/oauth/platform-registry';
import { tokenRefreshCircuitBreaker, CircuitBreakerOpenError } from '@/lib/circuit-breaker';
import { createNotification } from '@/lib/notifications/server-dispatch';

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
  const REQUEST_TIMEOUT_MS = 30000;
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
  const REQUEST_TIMEOUT_MS = 30000;
  
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
    { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
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
    include: { Workspace: { select: { userId: true } } },
  });

  if (!account) {
    logger.warn('oauth.refresh.account_not_found', { accountId });
    return false;
  }

  return refreshAccountWithData(account);
}

/**
 * Internal refresh logic that accepts pre-fetched account data to avoid N+1 queries.
 */
async function refreshAccountWithData(
  account: {
    id: string;
    platform: string;
    workspaceId: string;
    status: string;
    refreshToken: string | null;
    tokenExpiry: Date | null;
    Workspace?: { userId: string } | null;
  },
): Promise<boolean> {
  if (account.status !== 'connected') {
    logger.debug('oauth.refresh.skip_non_connected', { accountId: account.id, status: account.status });
    return false;
  }

  if (!account.refreshToken) {
    if (account.platform === 'linkedin') {
      logger.info('oauth.refresh.no_refresh_token_linkedin', {
        accountId: account.id,
        tokenExpiry: account.tokenExpiry,
        message: 'LinkedIn does not issue refresh tokens for standard apps. Token valid until expiry.',
      });
      return false;
    }

    logger.warn('oauth.refresh.no_refresh_token', { accountId: account.id, platform: account.platform });
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { status: 'expired' },
    });

    // Notify user about expired account
    try {
      const userId = account.Workspace?.userId;
      if (userId) {
        await createNotification({
          userId,
          type: 'warning',
          category: 'connection',
          title: 'Account Connection Expired',
          description: `Your ${account.platform} account is no longer connected. Please reconnect to continue posting.`,
          actionUrl: '/dashboard/accounts',
          workspaceId: account.workspaceId,
        });
      }
    } catch (notifError) {
      logger.error('oauth.refresh.notification_failed', { accountId: account.id, error: String(notifError) });
    }

    return false;
  }

  let plainRefreshToken: string;
  try {
    plainRefreshToken = decryptToken(account.refreshToken);
  } catch {
    logger.error('oauth.refresh.decrypt_failed', { accountId: account.id });
    return false;
  }

  const isMeta = account.platform === 'instagram' || account.platform === 'facebook' || account.platform === 'threads';
  const refreshFn = isMeta ? refreshMetaPlatform : refreshStandardPlatform;

  // Check circuit breaker before attempting refresh
  if (await tokenRefreshCircuitBreaker.isOpen()) {
    logger.warn('oauth.refresh.circuit_open', {
      accountId: account.id,
      platform: account.platform,
    });
    return false;
  }

  let attempt = 0;
  let result: RefreshResult | undefined;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    result = await refreshFn(account.platform, plainRefreshToken, account.workspaceId);
    attempt++;

    if (result.success && result.accessToken) {
      await tokenRefreshCircuitBreaker.recordSuccess();
      break;
    }

    logger.warn('oauth.refresh.retry', {
      accountId: account.id,
      platform: account.platform,
      attempt,
      error: result.error,
    });

    if (attempt >= MAX_RETRY_ATTEMPTS) {
      await tokenRefreshCircuitBreaker.recordFailure();
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status: 'expired' },
      });

      // Notify user about expired account
      try {
        const userId = account.Workspace?.userId;
        if (userId) {
          await createNotification({
            userId,
            type: 'warning',
            category: 'connection',
            title: 'Account Connection Expired',
            description: `Your ${account.platform} account is no longer connected. Please reconnect to continue posting.`,
            actionUrl: '/dashboard/accounts',
            workspaceId: account.workspaceId,
          });
        }
      } catch (notifError) {
        logger.error('oauth.refresh.notification_failed', { accountId: account.id, error: String(notifError) });
      }

      return false;
    }

    await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
  }

  if (!result?.success || !result.accessToken) {
    return false;
  }

  const newTokenExpiry = result.expiresIn
    ? new Date(Date.now() + result.expiresIn * 1000)
    : account.tokenExpiry;

  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptToken(result.accessToken),
      refreshToken: result.refreshToken ? encryptToken(result.refreshToken) : account.refreshToken,
      tokenExpiry: newTokenExpiry,
      lastRefreshAt: new Date(),
      status: 'connected',
    },
  });

  logger.info('oauth.refresh.success', {
    accountId: account.id,
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
      platform: { not: 'linkedin' },
      OR: [
        {
          tokenExpiry: {
            lte: refreshThreshold,
          },
        },
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
      status: true,
      tokenExpiry: true,
      refreshToken: true,
      Workspace: { select: { userId: true } },
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
      const ok = await refreshAccountWithData(account);
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
