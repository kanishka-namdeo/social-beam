import { createHash, randomBytes } from 'crypto';
import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://api.twitter.com';
const AUTH_BASE = 'https://twitter.com';

/**
 * Generate a random 32-byte code verifier for PKCE flow.
 * Uses URL-safe base64 characters.
 */
export function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a code challenge from the verifier using SHA-256.
 */
export async function generateCodeChallenge(
  verifier: string
): Promise<string> {
  const hash = createHash('sha256').update(verifier).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Synchronous SHA-256 hash for code challenge (Node.js crypto).
 */
function generateCodeChallengeSync(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function getXAuthUrl(
  redirectUri: string,
  codeVerifier: string,
  state: string,
  clientId: string,
): string {
  logger.debug('oauth.x.auth_url_generated', { state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge_method: 'S256',
    code_challenge: '',
  });

  const codeChallenge = generateCodeChallengeSync(codeVerifier);
  params.set('code_challenge', codeChallenge);

  return `${AUTH_BASE}/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeXToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuthToken> {
  logger.debug('oauth.x.token_exchange_start');

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${API_BASE}/2/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.x.token_exchange_failed', { status: response.status });
    throw new Error(`X token exchange failed: ${JSON.stringify(data)}`);
  }

  logger.info('oauth.x.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export async function getXAccountInfo(
  accessToken: string,
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.x.account_info');
  const response = await fetch(`${API_BASE}/2/users/me?user.fields=username`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.x.account_info_failed', { status: response.status });
    throw new Error(`X account info failed: ${JSON.stringify(data)}`);
  }

  const user = data.data;

  logger.info('oauth.x.account_info_success', { platformUserId: user.id });
  return {
    platform: 'twitter',
    platformUserId: user.id,
    platformUsername: user.username,
  };
}
