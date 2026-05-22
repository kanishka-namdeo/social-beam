import { prisma } from '@/lib/prisma';
import { decryptToken, encryptToken } from '@/lib/agent/tools/social-tools';
import { logger } from '@/lib/logger';

const ENV_VAR_MAP: Record<string, { clientId: string; clientSecret: string }> = {
  instagram: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET' },
  facebook: { clientId: 'META_APP_ID', clientSecret: 'META_APP_SECRET' },
  x: { clientId: 'X_CLIENT_ID', clientSecret: 'X_CLIENT_SECRET' },
  linkedin: { clientId: 'LINKEDIN_CLIENT_ID', clientSecret: 'LINKEDIN_CLIENT_SECRET' },
  tiktok: { clientId: 'TIKTOK_CLIENT_KEY', clientSecret: 'TIKTOK_CLIENT_SECRET' },
  pinterest: { clientId: 'PINTEREST_APP_ID', clientSecret: 'PINTEREST_APP_SECRET' },
};

/**
 * Resolve credentials for a given user and platform.
 * Priority: user-configured UserOAuthApp -> env var fallback.
 * Returns null if neither is available.
 */
export async function resolveCredentials(
  userId: string,
  platform: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const normalizedPlatform = platform.toLowerCase();

  // Try user-configured credentials first
  const userApp = await prisma.userOAuthApp.findUnique({
    where: { userId_platform: { userId, platform: normalizedPlatform } },
  });

  if (userApp) {
    try {
      const clientId = decryptToken(userApp.clientId);
      const clientSecret = decryptToken(userApp.clientSecret);
      logger.debug('oauth.credentials.resolved_from_user_config', { userId, platform: normalizedPlatform });
      return { clientId, clientSecret };
    } catch {
      logger.error('oauth.credentials.decrypt_failed', { userId, platform: normalizedPlatform });
      // Fall through to env vars
    }
  }

  // Fall back to env vars
  const envVars = ENV_VAR_MAP[normalizedPlatform];
  if (envVars) {
    const clientId = process.env[envVars.clientId] ?? '';
    const clientSecret = process.env[envVars.clientSecret] ?? '';
    if (clientId && clientSecret) {
      logger.debug('oauth.credentials.resolved_from_env', { platform: normalizedPlatform });
      return { clientId, clientSecret };
    }
  }

  logger.warn('oauth.credentials.not_found', { userId, platform: normalizedPlatform });
  return null;
}

/**
 * Resolve credentials when no user context is available (e.g. onboarding agent).
 * Falls back to env vars only.
 */
export async function resolveCredentialsForPlatform(
  platform: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const normalizedPlatform = platform.toLowerCase();
  const envVars = ENV_VAR_MAP[normalizedPlatform];
  if (!envVars) {
    logger.warn('oauth.credentials.unknown_platform', { platform: normalizedPlatform });
    return null;
  }

  const clientId = process.env[envVars.clientId] ?? '';
  const clientSecret = process.env[envVars.clientSecret] ?? '';
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  logger.warn('oauth.credentials.env_not_found', { platform: normalizedPlatform });
  return null;
}

/**
 * Upsert user OAuth app credentials.
 * Encrypts both clientId and clientSecret before storage.
 */
export async function upsertUserCredentials(
  userId: string,
  platform: string,
  clientId: string,
  clientSecret: string,
): Promise<{ success: boolean; error?: string }> {
  const normalizedPlatform = platform.toLowerCase();

  try {
    const encryptedClientId = encryptToken(clientId);
    const encryptedClientSecret = encryptToken(clientSecret);

    await prisma.userOAuthApp.upsert({
      where: {
        userId_platform: { userId, platform: normalizedPlatform },
      },
      create: {
        userId,
        platform: normalizedPlatform,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
      },
      update: {
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
      },
    });

    logger.info('oauth.credentials.upserted', { userId, platform: normalizedPlatform });
    return { success: true };
  } catch (err) {
    logger.error('oauth.credentials.upsert_failed', {
      userId,
      platform: normalizedPlatform,
      error: String(err),
    });
    return { success: false, error: `Failed to save credentials: ${err}` };
  }
}

/**
 * Delete user OAuth app credentials.
 */
export async function deleteUserCredentials(
  userId: string,
  platform: string,
): Promise<{ success: boolean; error?: string }> {
  const normalizedPlatform = platform.toLowerCase();

  try {
    await prisma.userOAuthApp.delete({
      where: {
        userId_platform: { userId, platform: normalizedPlatform },
      },
    });

    logger.info('oauth.credentials.deleted', { userId, platform: normalizedPlatform });
    return { success: true };
  } catch (err) {
    logger.error('oauth.credentials.delete_failed', {
      userId,
      platform: normalizedPlatform,
      error: String(err),
    });
    return { success: false, error: `Failed to remove credentials: ${err}` };
  }
}

/**
 * List all platforms with their configuration status for a user.
 * Checks both user-configured (database) and env var credentials.
 */
export async function listUserOAuthApps(
  userId: string,
): Promise<Array<{ platform: string; isConfigured: boolean; hasClientId: boolean; hasSecret: boolean }>> {
  const allPlatforms = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'pinterest'];

  const userApps = await prisma.userOAuthApp.findMany({
    where: { userId },
    select: { platform: true },
  });

  const userConfiguredSet = new Set(userApps.map((a) => a.platform));

  return allPlatforms.map((platform) => {
    const envVars = ENV_VAR_MAP[platform];
    const hasEnvCredentials = envVars
      ? !!(process.env[envVars.clientId] && process.env[envVars.clientSecret])
      : false;

    const isConfigured = userConfiguredSet.has(platform) || hasEnvCredentials;

    return {
      platform,
      isConfigured,
      hasClientId: isConfigured,
      hasSecret: isConfigured,
    };
  });
}
