import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://api.linkedin.com/v2';

// Approved OAuth scopes for the LinkedIn app:
// openid, profile, email — Sign In with LinkedIn (OIDC)
// w_member_social — create/update/delete posts, comments, and reactions
const APPROVED_SCOPES = 'openid profile email w_member_social';

export function getLinkedinAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
): string {
  logger.debug('oauth.linkedin.auth_url_generated', { state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: APPROVED_SCOPES,
    state,
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedinToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.linkedin.token_exchange_start');

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.linkedin.token_exchange_failed', { status: response.status });
    throw new Error(
      `LinkedIn token exchange failed: ${JSON.stringify(data)}`
    );
  }

  logger.info('oauth.linkedin.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
  };
}

export async function getLinkedinAccountInfo(
  accessToken: string,
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.linkedin.account_info');
  const response = await fetch(`${API_BASE}/userinfo`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.linkedin.account_info_failed', { status: response.status });
    throw new Error(
      `LinkedIn account info failed: ${JSON.stringify(data)}`
    );
  }

  logger.info('oauth.linkedin.account_info_success', { platformUserId: data.sub });
  return {
    platform: 'linkedin',
    platformUserId: data.sub,
    platformUsername: data.name,
  };
}
