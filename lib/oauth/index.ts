import { getPlatform, getSupportedPlatforms, getPlatformEnvVars, getRefreshUrl, getDisplayName, getIconComponent, isMetaPlatform, isGooglePlatform, isDirectAuthPlatform } from './platform-registry';

export * from './types';
export * from './crypto';
export * from './platform-registry';
export * from './platforms/meta';
export * from './platforms/x';
export * from './platforms/linkedin';
export * from './platforms/tiktok';
export * from './platforms/pinterest';
export * from './platforms/threads';
export * from './platforms/google-business';
export * from './platforms/youtube';
export * from './platforms/bluesky';

// Re-export helpers for backwards compatibility
export { getPlatform, getSupportedPlatforms, getPlatformEnvVars, getRefreshUrl, getDisplayName, getIconComponent, isMetaPlatform, isGooglePlatform, isDirectAuthPlatform };
