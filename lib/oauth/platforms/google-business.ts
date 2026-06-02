import { createHash } from 'crypto';
import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const AUTH_BASE = 'https://accounts.google.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://mybusiness.googleapis.com/v4';

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

export function getGoogleBusinessAuthUrl(
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
    scope: 'https://www.googleapis.com/auth/business.manage',
    state,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_BASE}/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleBusinessToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier: string,
): Promise<OAuthToken> {
  logger.debug('oauth.google_business.token_exchange_start');

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
    logger.error('oauth.google_business.token_exchange_failed', { status: response.status });
    throw new Error(`Google Business token exchange failed: ${JSON.stringify(data)}`);
  }

  logger.info('oauth.google_business.token_exchange_success');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export async function getGoogleBusinessAccountInfo(
  accessToken: string,
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.google_business.account_info');

  // Get accounts list first
  const accountsResponse = await fetch(
    `${API_BASE}/accounts`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!accountsResponse.ok) {
    logger.error('oauth.google_business.accounts_failed', { status: accountsResponse.status });
    throw new Error(`Google Business accounts fetch failed: ${accountsResponse.status}`);
  }

  const accountsData = await accountsResponse.json() as Record<string, unknown>;
  const accounts = (accountsData.accounts as Array<Record<string, unknown>>) ?? [];

  if (accounts.length === 0) {
    throw new Error('No Google Business accounts found');
  }

  // Use the first account
  const account = accounts[0];
  const accountName = account.name as string; // e.g. "accounts/123456789"
  const accountTitle = (account.title ?? accountName) as string;

  // Extract account ID from the name
  const accountId = accountName.split('/').pop() ?? accountName;

  logger.info('oauth.google_business.account_info_success', { accountId });
  return {
    platform: 'googleBusiness',
    platformUserId: accountId,
    platformUsername: accountTitle,
  };
}
