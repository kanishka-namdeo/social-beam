import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://api.pinterest.com/v5';

export function getPinterestAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
): string {
  logger.debug('oauth.pinterest.auth_url_generated', { state });
  const params = new URLSearchParams({
    response_type: 'code',
    app_id: clientId,
    redirect_uri: redirectUri,
    scope: 'boards:read,pins:read,pins:write,user_accounts:read',
    state,
  });

  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export async function exchangePinterestToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.pinterest.token_exchange_start');

  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      app_id: clientId,
      app_secret: clientSecret,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.pinterest.token_exchange_failed', { status: response.status });
    throw new Error(
      `Pinterest token exchange failed: ${JSON.stringify(data)}`
    );
  }

  logger.info('oauth.pinterest.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
  };
}

export async function getPinterestAccountInfo(
  accessToken: string
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.pinterest.account_info');
  const response = await fetch(`${API_BASE}/user_account`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.pinterest.account_info_failed', { status: response.status });
    throw new Error(
      `Pinterest account info failed: ${JSON.stringify(data)}`
    );
  }

  logger.info('oauth.pinterest.account_info_success', { platformUserId: data.id });
  return {
    platform: 'pinterest',
    platformUserId: data.id,
    platformUsername: data.username || data.full_name,
  };
}
