import { PlatformConfig } from './types';
import { logger } from '@/lib/logger';

export * from './types';
export * from './crypto';
export * from './platforms/meta';
export * from './platforms/x';
export * from './platforms/linkedin';
export * from './platforms/tiktok';
export * from './platforms/pinterest';

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    scopes: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts',
    apiBaseUrl: 'https://graph.facebook.com/v22.0',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  facebook: {
    name: 'Facebook',
    authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
    scopes: 'pages_manage_posts,pages_read_engagement,pages_manage_metadata',
    apiBaseUrl: 'https://graph.facebook.com/v22.0',
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  twitter: {
    name: 'X (Twitter)',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: 'tweet.read,tweet.write,users.read,offline.access',
    apiBaseUrl: 'https://api.twitter.com',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
  },
  linkedin: {
    name: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: 'openid,profile,w_member_social',
    apiBaseUrl: 'https://api.linkedin.com/v2',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },
  tiktok: {
    name: 'TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: 'video.upload,user.info.basic',
    apiBaseUrl: 'https://open.tiktokapis.com',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
  },
  pinterest: {
    name: 'Pinterest',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: 'boards:read,pins:read,pins:write,user_accounts:read',
    apiBaseUrl: 'https://api.pinterest.com/v5',
    clientIdEnv: 'PINTEREST_APP_ID',
    clientSecretEnv: 'PINTEREST_APP_SECRET',
  },
};

/**
 * Get the platform configuration by name.
 * Returns null if the platform is not supported.
 */
export function getPlatform(name: string): PlatformConfig | null {
  const config = PLATFORM_CONFIGS[name.toLowerCase()];
  if (!config) {
    logger.warn('oauth.platform_lookup.unknown', { platform: name });
  }
  return config || null;
}

/**
 * Get all supported platform names.
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(PLATFORM_CONFIGS);
}
