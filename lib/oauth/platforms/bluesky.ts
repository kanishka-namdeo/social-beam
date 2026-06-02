import { OAuthToken, ConnectedAccountInfo } from '../types';
import { logger } from '@/lib/logger';

const API_BASE = 'https://bsky.social/xrpc';

/**
 * Bluesky uses direct authentication via AT Protocol.
 * Users provide their handle (identifier) and app password directly.
 * No OAuth redirect flow needed.
 */

export interface BlueskyCredentials {
  identifier: string;
  appPassword: string;
}

export async function createBlueskySession(
  credentials: BlueskyCredentials,
): Promise<OAuthToken> {
  logger.debug('oauth.bluesky.session_create_start');

  const response = await fetch(`${API_BASE}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.appPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.bluesky.session_create_failed', { status: response.status });
    throw new Error(`Bluesky session creation failed: ${JSON.stringify(data)}`);
  }

  logger.info('oauth.bluesky.session_create_success');
  return {
    accessToken: data.accessJwt,
    refreshToken: data.refreshJwt,
    expiresIn: undefined, // Bluesky tokens don't have standard expiry
    tokenType: 'Bearer',
  };
}

export async function refreshBlueskySession(
  accessJwt: string,
): Promise<OAuthToken> {
  logger.debug('oauth.bluesky.session_refresh_start');

  const response = await fetch(`${API_BASE}/com.atproto.server.refreshSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessJwt}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('oauth.bluesky.session_refresh_failed', { status: response.status });
    throw new Error(`Bluesky session refresh failed: ${JSON.stringify(data)}`);
  }

  logger.info('oauth.bluesky.session_refresh_success');
  return {
    accessToken: data.accessJwt,
    refreshToken: data.refreshJwt,
    expiresIn: undefined,
    tokenType: 'Bearer',
  };
}

export async function getBlueskyAccountInfo(
  accessJwt: string,
  handle: string,
): Promise<ConnectedAccountInfo> {
  logger.debug('oauth.bluesky.account_info');

  const response = await fetch(
    `${API_BASE}/com.atproto.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessJwt}` },
    }
  );

  if (!response.ok) {
    logger.error('oauth.bluesky.account_info_failed', { status: response.status });
    throw new Error(`Bluesky account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    platform: 'bluesky',
    platformUserId: data.did as string,
    platformUsername: data.handle as string,
  };
}
