import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://graph.facebook.com/v22.0';

export function getThreadsAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
  });
  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeThreadsToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.threads.token_exchange_start');

  // Step 1: Exchange authorization code for short-lived token
  const tokenResponse = await fetch(
    `${API_BASE}/oauth/access_token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&client_secret=${clientSecret}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    logger.error('oauth.threads.token_exchange_failed', { reason: 'short_lived', status: tokenResponse.status });
    throw new Error(`Threads token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  const shortLivedToken = tokenData.access_token;

  // Step 2: Exchange short-lived token for long-lived token (same as Meta)
  const longLivedParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  const longLivedResponse = await fetch(
    `${API_BASE}/oauth/access_token?${longLivedParams.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const longLivedData = await longLivedResponse.json();

  if (!longLivedResponse.ok) {
    logger.error('oauth.threads.token_exchange_failed', { reason: 'long_lived', status: longLivedResponse.status });
    throw new Error(
      `Threads long-lived token exchange failed: ${JSON.stringify(longLivedData)}`
    );
  }

  logger.info('oauth.threads.token_exchange_success');
  return {
    accessToken: longLivedData.access_token,
    expiresIn: longLivedData.expires_in,
    tokenType: 'Bearer',
  };
}

export async function getThreadsAccountInfo(
  accessToken: string
): Promise<ConnectedAccountInfo> {
  // First get the Threads user ID via /me with threads profile fields
  const response = await fetch(
    `${API_BASE}/me?fields=id,name,threads_profile_picture_url&access_token=${accessToken}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Threads account info fetch failed: ${JSON.stringify(data)}`
    );
  }

  return {
    platform: 'threads',
    platformUserId: data.id,
    platformUsername: data.name ?? `@${data.id}`,
  };
}
