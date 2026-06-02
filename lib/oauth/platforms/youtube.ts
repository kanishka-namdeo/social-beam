import { createHash } from 'crypto';
import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const AUTH_BASE = 'https://accounts.google.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Generate a code challenge from the verifier using SHA-256.
 */
function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function getYoutubeAuthUrl(
  redirectUri: string,
  state: string,
  clientId: string,
  codeVerifier: string,
): string {
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl',
    state,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_BASE}/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYoutubeToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier: string,
): Promise<OAuthToken> {
  logger.debug('oauth.youtube.token_exchange_start');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.youtube.token_exchange_failed', { status: response.status });
    throw new Error(`YouTube token exchange failed: ${JSON.stringify(data)}`);
  }

  logger.info('oauth.youtube.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export async function getYoutubeAccountInfo(
  accessToken: string,
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.youtube.account_info');

  const response = await fetch(
    `${API_BASE}/channels?part=snippet&mine=true`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    logger.error('oauth.youtube.account_info_failed', { status: response.status });
    throw new Error(`YouTube account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const items = (data.items as Array<Record<string, unknown>>) ?? [];

  if (items.length === 0) {
    throw new Error('No YouTube channels found');
  }

  const channel = items[0];
  const snippet = channel.snippet as Record<string, unknown> | undefined;

  return {
    platform: 'youtube',
    platformUserId: channel.id as string,
    platformUsername: (snippet?.title as string) ?? (channel.id as string),
  };
}
