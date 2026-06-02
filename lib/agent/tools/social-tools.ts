import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@/app/generated/prisma/internal/prismaNamespace';
import { logger } from '@/lib/logger';
import { resolveCredentials } from '@/lib/oauth/credentials';
import { encryptToken } from '@/lib/oauth/crypto';
import { fetchAccountInfo } from '@/lib/oauth/account-info';
import { getPlatform, isGooglePlatform } from '@/lib/oauth/platform-registry';

const InitiateOauthSchema = z.object({
  platform: z.string().describe('Platform name: instagram, facebook, x, linkedin, tiktok, pinterest, threads, googleBusiness, youtube, or bluesky'),
  userId: z.string().describe('The authenticated user ID'),
  workspaceId: z.string().describe('The workspace ID to associate this account with'),
  redirectTo: z.string().optional().describe('Where to redirect after OAuth: onboarding (default) or settings'),
});

const CompleteOauthSchema = z.object({
  platform: z.string().describe('Platform name'),
  code: z.string().describe('Authorization code from the callback'),
  userId: z.string().describe('The authenticated user ID'),
  workspaceId: z.string().describe('The workspace ID to associate this account with'),
  codeVerifier: z.string().optional().describe('PKCE code verifier (required for X/Twitter, Google Business, YouTube)'),
});

const ListPlatformsSchema = z.object({
  userId: z.string().describe('The authenticated user ID'),
  workspaceId: z.string().describe('The workspace ID to query'),
});


export const initiateOauthTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const parsed = InitiateOauthSchema.parse(input);
    const { platform, userId, workspaceId, redirectTo = 'onboarding' } = parsed;

    logger.debug('tool.invoke', { toolName: 'initiate_oauth', platform, userId });

    // ─── DEBUG: Log OAuth initiation ──────────────────────────────────────
    console.log('[OAUTH DEBUG] initiate_oauth called', { platform, userId, workspaceId, redirectTo });
    // ──────────────────────────────────────────────────────────────────────

    const platformConfig = getPlatform(platform);
    if (!platformConfig) {
      logger.warn('tool.unsupported_platform', { toolName: 'initiate_oauth', platform });
      return JSON.stringify({ error: `Unsupported platform: ${platform}` });
    }

    const credentials = await resolveCredentials(userId, platform);
    if (!credentials) {
      logger.warn('tool.missing_credentials', { toolName: 'initiate_oauth', platform, userId });
      return JSON.stringify({ error: `OAuth not configured for ${platform}. Configure your developer app credentials in Settings > Developer Apps.` });
    }

    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/onboarding/oauth/callback`;
    const redirectUri = callbackUrl;
    const state = encodeURIComponent(JSON.stringify({ platform, userId, workspaceId, redirectTo }));

    // Debug: log credential source and key OAuth params for troubleshooting
    const clientIdMasked = credentials.clientId.slice(0, 4) + '…' + credentials.clientId.slice(-4);
    logger.info('oauth.initiate.debug', {
      platform,
      clientIdMasked,
      credentialSource: credentials.source,
      authUrl: platformConfig.authUrl,
      baseUrl,
      redirectUriDecoded: callbackUrl,
      scopes: platformConfig.scopes,
    });

    let authUrl: string;

    if (platform.toLowerCase() === 'x') {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const oauthState = JSON.stringify({ platform, userId, workspaceId, codeVerifier, redirectTo });
      const xState = encodeURIComponent(oauthState);
      authUrl = `${platformConfig.authUrl}?response_type=code&client_id=${credentials.clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(platformConfig.scopes)}&state=${xState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      logger.info('tool.complete', { toolName: 'initiate_oauth', platform, duration: Date.now() - start });
      return JSON.stringify({ authUrl, platform });
    }

    if (isGooglePlatform(platform.toLowerCase())) {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const oauthState = JSON.stringify({ platform, userId, workspaceId, codeVerifier, redirectTo });
      const googleState = encodeURIComponent(oauthState);
      authUrl = `${platformConfig.authUrl}?response_type=code&client_id=${credentials.clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(platformConfig.scopes)}&state=${googleState}&code_challenge=${codeChallenge}&code_challenge_method=S256&access_type=offline&prompt=consent`;
      logger.info('tool.complete', { toolName: 'initiate_oauth', platform, duration: Date.now() - start });
      return JSON.stringify({ authUrl, platform });
    }

    authUrl = `${platformConfig.authUrl}?response_type=code&client_id=${credentials.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(platformConfig.scopes)}&state=${state}`;

    // ─── DEBUG: Log final auth URL and all parameters ────────────────────
    console.log('[OAUTH DEBUG] === OAuth Auth URL Generated ===');
    console.log('[OAUTH DEBUG] Platform:', platform);
    console.log('[OAUTH DEBUG] Auth URL (full, exact):', authUrl);
    console.log('[OAUTH DEBUG] Base URL (AUTH_URL env):', baseUrl);
    console.log('[OAUTH DEBUG] Callback URL:', callbackUrl);
    console.log('[OAUTH DEBUG] Redirect URI (raw):', redirectUri);
    console.log('[OAUTH DEBUG] Redirect URI (in URL - encoded?):', redirectUri === encodeURIComponent(redirectUri) ? 'NO - raw value used' : 'NO - raw value used (contains special chars)');
    console.log('[OAUTH DEBUG] Client ID (masked):', clientIdMasked);
    console.log('[OAUTH DEBUG] Client ID (full):', credentials.clientId);
    console.log('[OAUTH DEBUG] Credential source:', credentials.source);
    console.log('[OAUTH DEBUG] Scopes (raw):', platformConfig.scopes);
    console.log('[OAUTH DEBUG] Scopes (encoded in URL):', encodeURIComponent(platformConfig.scopes));
    console.log('[OAUTH DEBUG] State (encoded):', state);
    console.log('[OAUTH DEBUG] State (decoded):', decodeURIComponent(state));
    console.log('[OAUTH DEBUG] Platform auth URL:', platformConfig.authUrl);
    console.log('[OAUTH DEBUG] Requires PKCE:', platformConfig.requiresPkce);

    // Parse the generated URL to show each query param individually
    try {
      const parsedUrl = new URL(authUrl);
      console.log('[OAUTH DEBUG] Parsed query parameters:');
      console.log('[OAUTH DEBUG]   response_type:', parsedUrl.searchParams.get('response_type'));
      console.log('[OAUTH DEBUG]   client_id:', parsedUrl.searchParams.get('client_id'));
      console.log('[OAUTH DEBUG]   redirect_uri:', parsedUrl.searchParams.get('redirect_uri'));
      console.log('[OAUTH DEBUG]   redirect_uri (decoded):', decodeURIComponent(parsedUrl.searchParams.get('redirect_uri') || ''));
      console.log('[OAUTH DEBUG]   scope:', parsedUrl.searchParams.get('scope'));
      console.log('[OAUTH DEBUG]   scope (decoded):', decodeURIComponent(parsedUrl.searchParams.get('scope') || ''));
      console.log('[OAUTH DEBUG]   state:', parsedUrl.searchParams.get('state')?.slice(0, 100) + '...');
      console.log('[OAUTH DEBUG] Full URL for direct test:', authUrl);
    } catch {
      console.log('[OAUTH DEBUG] Could not parse auth URL (unexpected format)');
    }
    console.log('[OAUTH DEBUG] ============================================');
    // ──────────────────────────────────────────────────────────────────────

    // Parse the generated URL to show each query param individually
    try {
      const parsedUrl = new URL(authUrl);
      const allParams = Array.from(parsedUrl.searchParams.entries());
      console.log('\n===== FINAL AUTH URL =====');
      console.log(authUrl);
      console.log('\n===== PARSED QUERY PARAMETERS =====');
      allParams.forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('===============================\n');
    } catch {}

    logger.info('tool.complete', { toolName: 'initiate_oauth', platform, duration: Date.now() - start });
    return JSON.stringify({ authUrl, platform });
  },
  {
    name: 'initiate_oauth',
    description: 'Start OAuth flow for a social platform. Returns the authorization URL to redirect the user.',
    schema: InitiateOauthSchema,
  }
);

export async function exchangeCodeForTokens(
  platform: string,
  code: string,
  codeVerifier?: string,
  userId?: string,
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  platformUserId?: string;
  error?: string;
}> {
  logger.debug('oauth.token_exchange', { platform });

  const platformTokenUrls: Record<string, { url: string; method: string; isX?: boolean }> = {
    instagram: { url: 'https://graph.facebook.com/v22.0/oauth/access_token', method: 'GET' },
    facebook: { url: 'https://graph.facebook.com/v22.0/oauth/access_token', method: 'GET' },
    x: { url: 'https://api.twitter.com/2/oauth2/token', method: 'POST', isX: true },
    linkedin: { url: 'https://www.linkedin.com/oauth/v2/accessToken', method: 'POST' },
    tiktok: { url: 'https://open.tiktokapis.com/v2/oauth/token/', method: 'POST' },
    pinterest: { url: 'https://api.pinterest.com/v5/oauth/token', method: 'POST' },
    threads: { url: 'https://graph.facebook.com/v22.0/oauth/access_token', method: 'GET' },
    googleBusiness: { url: 'https://oauth2.googleapis.com/token', method: 'POST' },
    youtube: { url: 'https://oauth2.googleapis.com/token', method: 'POST' },
  };

  const tokenConfig = platformTokenUrls[platform.toLowerCase()];
  if (!tokenConfig) {
    logger.error('oauth.unsupported_platform', { platform });
    return { success: false, error: `Unsupported platform: ${platform}` };
  }

  // Resolve credentials: user-configured -> env var fallback
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  if (userId) {
    const resolved = await resolveCredentials(userId, platform);
    if (resolved) {
      clientId = resolved.clientId;
      clientSecret = resolved.clientSecret;
    }
  }

  // If no user credentials found, caller should have set env vars
  // (handled by resolveCredentials fallback)
  if (!clientId || !clientSecret) {
    logger.error('oauth.missing_credentials', { platform });
    return { success: false, error: `No OAuth credentials configured for ${platform}` };
  }

  const redirectUri = `${process.env.AUTH_URL ?? 'http://localhost:3000'}/api/onboarding/oauth/callback`;

  let response: Response;

  if (tokenConfig.method === 'GET') {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    response = await fetch(`${tokenConfig.url}?${params}`);
  } else if (tokenConfig.isX) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier ?? '',
    });
    response = await fetch(tokenConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body,
    });
  } else if (platform.toLowerCase() === 'googlebusiness' || platform.toLowerCase() === 'youtube') {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier ?? '',
    });
    response = await fetch(tokenConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } else {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });
    response = await fetch(tokenConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    logger.error('oauth.token_exchange_failed', { platform, statusCode: response.status });
    return { success: false, error: (data.error_description ?? data.error ?? 'Token exchange failed') as string };
  }

  const accessToken = (data.access_token ?? data.access_token) as string | undefined;
  const refreshToken = data.refresh_token as string | undefined;
  const expiresIn = data.expires_in as number | undefined;

  // For LinkedIn OpenID Connect, extract sub from the id_token JWT
  let platformUserId =
    (data.uid as string | undefined) ??
    (data.id as string | undefined) ??
    (data.sub as string | undefined);

  if (!platformUserId && platform.toLowerCase() === 'linkedin') {
    const idToken = data.id_token as string | undefined;
    if (idToken) {
      try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
        platformUserId = (payload.sub as string | undefined) ?? (payload.name as string | undefined);
      } catch {
        logger.warn('oauth.linkedin.id_token_decode_failed');
      }
    }
  }

  logger.info('oauth.token_exchange_success', { platform });
  return { success: true, accessToken, refreshToken, expiresIn, platformUserId };
}

/**
 * Enrich token exchange results with account info from platform APIs.
 * Returns additional fields (username, avatar, follower count) or null on failure.
 */
export async function enrichWithAccountInfo(
  platform: string,
  accessToken: string,
): Promise<{ platformUsername?: string; avatarUrl?: string; followerCount?: number } | null> {
  try {
    const info = await fetchAccountInfo(platform, accessToken);
    if (!info) return null;
    return {
      platformUsername: info.platformUsername,
      avatarUrl: info.avatarUrl,
      followerCount: info.followerCount,
    };
  } catch {
    logger.warn('oauth.enrich_account_info_failed', { platform });
    return null;
  }
}

export { encryptToken, decryptToken } from '@/lib/oauth/crypto';

export async function persistConnectedAccount(params: {
  workspaceId: string;
  platform: string;
  platformUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  platformUsername?: string;
  avatarUrl?: string;
  followerCount?: number;
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId, platform, platformUserId, accessToken, refreshToken, expiresIn, platformUsername, avatarUrl, followerCount } = params;
  const tokenExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  logger.debug('oauth.persist_account', { platform, workspaceId });

  try {
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : '';

    await prisma.connectedAccount.upsert({
      where: {
        workspaceId_platform: { workspaceId, platform: platform.toLowerCase() },
      },
      create: {
        id: crypto.randomUUID(),
        workspaceId,
        platform: platform.toLowerCase(),
        platformUserId,
        platformUsername: platformUsername ?? null,
        avatarUrl: avatarUrl ?? null,
        followerCount: followerCount ?? null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        lastRefreshAt: refreshToken ? new Date() : null,
        lastSyncedAt: new Date(),
        status: 'connected',
      },
      update: {
        platformUserId,
        platformUsername: platformUsername ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        followerCount: followerCount ?? undefined,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || undefined,
        tokenExpiry,
        lastRefreshAt: refreshToken ? new Date() : undefined,
        lastSyncedAt: new Date(),
        status: 'connected',
      },
    });
    logger.info('oauth.account_persisted', { platform, workspaceId });
    return { success: true };
  } catch (err) {
    const error = err as Error;
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      logger.warn('oauth.account_already_connected', { platform, workspaceId });
      return { success: false, error: 'Account already connected' };
    }
    logger.error('oauth.persist_failed', { platform, workspaceId, error: error.message });
    return { success: false, error: `Failed to persist account: ${error.message}` };
  }
}

export async function queryConnectedPlatforms(_userId: string, workspaceId: string) {
  logger.debug('oauth.query_connected', { workspaceId });

  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
    select: { platform: true, status: true, tokenExpiry: true },
  });

  const connectedSet = new Map(accounts.map(a => [a.platform, a]));

  const allPlatforms = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'pinterest', 'threads', 'googleBusiness', 'youtube', 'bluesky'];

  return {
    platforms: allPlatforms.map(name => {
      const connected = connectedSet.get(name);
      if (!connected) return { name, connected: false };
      const expired = connected.tokenExpiry && connected.tokenExpiry < new Date();
      return {
        name,
        connected: !expired && connected.status === 'connected',
        status: expired ? 'expired' : connected.status,
      };
    }),
  };
}

export const completeOauthTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { platform, code, workspaceId, codeVerifier, userId } = CompleteOauthSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'complete_oauth', platform, workspaceId });

    const tokenResult = await exchangeCodeForTokens(platform, code, codeVerifier, userId);
    if (!tokenResult.success) {
      logger.error('tool.oauth_token_exchange_failed', { toolName: 'complete_oauth', platform, error: tokenResult.error });
      return JSON.stringify({ error: tokenResult.error });
    }

    if (!tokenResult.accessToken) {
      return JSON.stringify({ error: 'Token exchange succeeded but no access token returned' });
    }

    const platformUserId = tokenResult.platformUserId;
    if (!platformUserId) {
      return JSON.stringify({ error: 'Could not determine platform user ID' });
    }

    // Fetch account info from platform APIs to get username, avatar, etc.
    const accountInfo = await enrichWithAccountInfo(platform, tokenResult.accessToken);

    const persistResult = await persistConnectedAccount({
      workspaceId,
      platform,
      platformUserId,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.expiresIn,
      ...accountInfo,
    });

    if (!persistResult.success) {
      return JSON.stringify({ error: persistResult.error });
    }

    logger.info('tool.complete', { toolName: 'complete_oauth', platform, duration: Date.now() - start });
    return JSON.stringify({
      success: true,
      platform,
      connected: true,
    });
  },
  {
    name: 'complete_oauth',
    description: 'Complete OAuth flow by exchanging an authorization code for tokens and persisting to the database.',
    schema: CompleteOauthSchema,
  }
);

export const listConnectedPlatformsTool = tool(
  async (input: unknown) => {
    const { workspaceId } = ListPlatformsSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'list_connected_platforms', workspaceId });

    const result = await queryConnectedPlatforms('', workspaceId);

    logger.info('tool.complete', { toolName: 'list_connected_platforms', workspaceId, platformCount: result.platforms.filter(p => p.connected).length });
    return JSON.stringify(result);
  },
  {
    name: 'list_connected_platforms',
    description: 'List all social platforms and their actual connection status from the database.',
    schema: ListPlatformsSchema,
  }
);

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
