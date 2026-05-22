import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://graph.facebook.com/v22.0';

export function getMetaAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
  scopes: string = 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts',
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  });
  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.meta.token_exchange_start');

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
    logger.error('oauth.meta.token_exchange_failed', { reason: 'short_lived', status: tokenResponse.status });
    throw new Error(`Meta token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  const shortLivedToken = tokenData.access_token;

  // Step 2: Exchange short-lived token for long-lived token
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
    logger.error('oauth.meta.token_exchange_failed', { reason: 'long_lived', status: longLivedResponse.status });
    throw new Error(
      `Meta long-lived token exchange failed: ${JSON.stringify(longLivedData)}`
    );
  }

  logger.info('oauth.meta.token_exchange_success');
  return {
    accessToken: longLivedData.access_token,
    expiresIn: longLivedData.expires_in,
    tokenType: 'Bearer',
  };
}

export async function getMetaAccountInfo(
  accessToken: string
): Promise<ConnectedAccountInfo> {
  const response = await fetch(
    `${API_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account{id,username}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Meta account info fetch failed: ${JSON.stringify(data)}`
    );
  }

  // Use the first available page or Instagram account
  const page = data.data?.[0];
  if (!page) {
    throw new Error('No Facebook pages or Instagram accounts found');
  }

  const igAccount = page.instagram_business_account;

  return {
    platform: igAccount ? 'instagram' : 'facebook',
    platformUserId: igAccount?.id || page.id,
    platformUsername: igAccount?.username || page.name,
  };
}
