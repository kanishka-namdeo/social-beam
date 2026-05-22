import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://open.tiktokapis.com';

export function getTiktokAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
): string {
  logger.debug('oauth.tiktok.auth_url_generated', { state });
  const params = new URLSearchParams({
    response_type: 'code',
    client_key: clientId,
    redirect_uri: redirectUri,
    scope: 'video.upload,user.info.basic',
    state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTiktokToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.tiktok.token_exchange_start');

  const response = await fetch(`${API_BASE}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_key: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.tiktok.token_exchange_failed', { status: response.status });
    throw new Error(
      `TikTok token exchange failed: ${JSON.stringify(data)}`
    );
  }

  logger.info('oauth.tiktok.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export async function getTiktokAccountInfo(
  accessToken: string
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.tiktok.account_info');
  const response = await fetch(`${API_BASE}/v2/user/info/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    logger.error('oauth.tiktok.account_info_failed', { status: response.status });
    throw new Error(
      `TikTok account info failed: ${JSON.stringify(data)}`
    );
  }

  const user = data.data.user;

  logger.info('oauth.tiktok.account_info_success', { platformUserId: user.open_id });
  return {
    platform: 'tiktok',
    platformUserId: user.open_id,
    platformUsername: user.display_name,
  };
}
