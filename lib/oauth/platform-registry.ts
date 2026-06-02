import type { PlatformConfig, PlatformEnvVars, CredentialSource } from './types';

export const ALL_PLATFORMS = [
  'instagram',
  'facebook',
  'x',
  'linkedin',
  'tiktok',
  'pinterest',
  'threads',
  'googleBusiness',
  'youtube',
  'bluesky',
] as const;

export type PlatformKey = (typeof ALL_PLATFORMS)[number];

const PLATFORM_REGISTRY: Record<PlatformKey, PlatformConfig> = {
  // --- Existing platforms ---
  instagram: {
    name: 'Instagram',
    displayName: 'Instagram',
    authType: 'meta',
    refreshType: 'meta',
    credentialSource: 'meta',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    scopes: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts',
    apiBaseUrl: 'https://graph.facebook.com/v22.0',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    requiresPkce: false,
    iconComponent: 'InstagramLogo',
  },
  facebook: {
    name: 'Facebook',
    displayName: 'Facebook',
    authType: 'meta',
    refreshType: 'meta',
    credentialSource: 'meta',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    scopes: 'pages_manage_posts,pages_read_engagement,pages_manage_metadata',
    apiBaseUrl: 'https://graph.facebook.com/v22.0',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    requiresPkce: false,
    iconComponent: 'MetaLogo',
  },
  x: {
    name: 'X (Twitter)',
    displayName: 'X / Twitter',
    authType: 'oauth',
    refreshType: 'standard',
    credentialSource: 'own',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: 'tweet.read,tweet.write,users.read,offline.access',
    apiBaseUrl: 'https://api.twitter.com',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    requiresPkce: true,
    iconComponent: 'XLogo',
  },
  linkedin: {
    name: 'LinkedIn',
    displayName: 'LinkedIn',
    authType: 'oauth',
    refreshType: 'standard',
    credentialSource: 'own',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    // Approved scopes from LinkedIn OAuth 2.0 app configuration:
    // openid, profile, email - Sign In with LinkedIn (OIDC)
    // w_member_social - create/update/delete posts, comments, and reactions
    scopes: 'openid profile email w_member_social',
    apiBaseUrl: 'https://api.linkedin.com/v2',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    requiresPkce: false,
    iconComponent: 'LinkedinLogo',
  },
  tiktok: {
    name: 'TikTok',
    displayName: 'TikTok',
    authType: 'oauth',
    refreshType: 'standard',
    credentialSource: 'own',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: 'video.upload,user.info.basic',
    apiBaseUrl: 'https://open.tiktokapis.com',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    requiresPkce: false,
    iconComponent: 'TiktokLogo',
  },
  pinterest: {
    name: 'Pinterest',
    displayName: 'Pinterest',
    authType: 'oauth',
    refreshType: 'standard',
    credentialSource: 'own',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: 'boards:read,pins:read,pins:write,user_accounts:read',
    apiBaseUrl: 'https://api.pinterest.com/v5',
    clientIdEnv: 'PINTEREST_APP_ID',
    clientSecretEnv: 'PINTEREST_APP_SECRET',
    requiresPkce: false,
    iconComponent: 'PinterestLogo',
  },

  // --- New platforms ---
  threads: {
    name: 'Threads',
    displayName: 'Threads',
    authType: 'meta',
    refreshType: 'meta',
    credentialSource: 'meta',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    scopes: 'threads_basic,threads_content_publish',
    apiBaseUrl: 'https://graph.facebook.com/v22.0',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    requiresPkce: false,
    iconComponent: 'ThreadsLogo',
  },
  googleBusiness: {
    name: 'Google Business',
    displayName: 'Google Business',
    authType: 'google',
    refreshType: 'google',
    credentialSource: 'google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/business.manage',
    apiBaseUrl: 'https://mybusiness.googleapis.com/v4',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    requiresPkce: true,
    iconComponent: 'GoogleLogo',
  },
  youtube: {
    name: 'YouTube',
    displayName: 'YouTube',
    authType: 'google',
    refreshType: 'google',
    credentialSource: 'google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/youtube.upload,https://www.googleapis.com/auth/youtube.force-ssl',
    apiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    requiresPkce: true,
    iconComponent: 'YoutubeLogo',
  },
  bluesky: {
    name: 'Bluesky',
    displayName: 'Bluesky',
    authType: 'direct',
    refreshType: 'bluesky',
    credentialSource: 'own',
    authUrl: '',
    tokenUrl: 'https://bsky.social/xrpc/com.atproto.server.createSession',
    scopes: '',
    apiBaseUrl: 'https://bsky.social/xrpc',
    clientIdEnv: '',
    clientSecretEnv: '',
    requiresPkce: false,
    iconComponent: 'BlueskyLogo',
  },
};

// --- Env var mappings (shared credential sources) ---
const ENV_VAR_MAP: Record<string, PlatformEnvVars> = {
  instagram: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET' },
  facebook: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET' },
  x: { clientId: 'X_CLIENT_ID', clientSecret: 'X_CLIENT_SECRET' },
  linkedin: { clientId: 'LINKEDIN_CLIENT_ID', clientSecret: 'LINKEDIN_CLIENT_SECRET' },
  tiktok: { clientId: 'TIKTOK_CLIENT_KEY', clientSecret: 'TIKTOK_CLIENT_SECRET' },
  pinterest: { clientId: 'PINTEREST_APP_ID', clientSecret: 'PINTEREST_APP_SECRET' },
  threads: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET' },
  googleBusiness: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
  youtube: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
  bluesky: { clientId: '', clientSecret: '' }, // Bluesky uses user-provided handle + app password
};

// --- Token refresh URLs for standard refresh flow ---
const REFRESH_URLS: Record<string, string> = {
  x: 'https://api.twitter.com/2/oauth2/token',
  linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
  tiktok: 'https://open.tiktokapis.com/v2/oauth/token/',
  pinterest: 'https://api.pinterest.com/v5/oauth/token',
  googleBusiness: 'https://oauth2.googleapis.com/token',
  youtube: 'https://oauth2.googleapis.com/token',
};

// --- Display name mapping ---
export const PLATFORM_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  ALL_PLATFORMS.map((key) => [key, PLATFORM_REGISTRY[key].displayName])
);

// --- Helpers ---

/**
 * Get the platform configuration by name.
 * Returns null if the platform is not supported.
 */
export function getPlatform(name: string): PlatformConfig | null {
  const config = PLATFORM_REGISTRY[name.toLowerCase() as PlatformKey];
  if (!config) {
    // logger.warn imported by callers
  }
  return config || null;
}

/**
 * Get all supported platform names.
 */
export function getSupportedPlatforms(): string[] {
  return [...ALL_PLATFORMS];
}

/**
 * Get env var mapping for a platform.
 */
export function getPlatformEnvVars(platform: string): PlatformEnvVars | undefined {
  return ENV_VAR_MAP[platform.toLowerCase()];
}

/**
 * Get token refresh URL for a platform (standard refresh flow only).
 * Returns undefined for platforms using custom refresh (meta, bluesky).
 */
export function getRefreshUrl(platform: string): string | undefined {
  return REFRESH_URLS[platform.toLowerCase()];
}

/**
 * Get all platforms that share a credential source.
 * E.g. ['instagram', 'facebook', 'threads'] all use META_APP_ID/SECRET.
 */
export function getSharedCredentialPlatforms(source: CredentialSource): string[] {
  return ALL_PLATFORMS.filter(
    (p) => PLATFORM_REGISTRY[p].credentialSource === source
  );
}

/**
 * Check if a platform uses Meta OAuth flow.
 */
export function isMetaPlatform(platform: string): boolean {
  return PLATFORM_REGISTRY[platform.toLowerCase() as PlatformKey]?.authType === 'meta';
}

/**
 * Check if a platform uses Google OAuth flow.
 */
export function isGooglePlatform(platform: string): boolean {
  return PLATFORM_REGISTRY[platform.toLowerCase() as PlatformKey]?.authType === 'google';
}

/**
 * Returns true when Google OAuth credentials are configured.
 * Used to conditionally show Google Business / YouTube connect cards.
 */
export function isGoogleOAuthAvailable(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Check if a platform uses direct auth (non-OAuth).
 */
export function isDirectAuthPlatform(platform: string): boolean {
  return PLATFORM_REGISTRY[platform.toLowerCase() as PlatformKey]?.authType === 'direct';
}

/**
 * Get the display name for a platform.
 */
export function getDisplayName(platform: string): string {
  return PLATFORM_REGISTRY[platform.toLowerCase() as PlatformKey]?.displayName ?? platform;
}

/**
 * Get the icon component name for a platform.
 */
export function getIconComponent(platform: string): string {
  return PLATFORM_REGISTRY[platform.toLowerCase() as PlatformKey]?.iconComponent ?? '';
}
