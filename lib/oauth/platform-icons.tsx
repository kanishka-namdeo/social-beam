import { InstagramLogo, MetaLogo, XLogo, LinkedinLogo, TiktokLogo, PinterestLogo, ThreadsLogo, GoogleLogo, YoutubeLogo, ChatCircleText } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import { ALL_PLATFORMS, PLATFORM_DISPLAY_NAMES as RAW_PLATFORM_DISPLAY_NAMES, getIconComponent, getSupportedPlatforms as getRawSupportedPlatforms, isGoogleOAuthAvailable } from './platform-registry';

/** PLATFORMS list with Google Business/YouTube removed when env vars are missing. */
export const PLATFORMS = isGoogleOAuthAvailable()
  ? ALL_PLATFORMS
  : ALL_PLATFORMS.filter((p) => p !== 'googleBusiness' && p !== 'youtube');

/** Re-export PLATFORM_DISPLAY_NAMES from registry for backwards compatibility. */
export const PLATFORM_DISPLAY_NAMES = RAW_PLATFORM_DISPLAY_NAMES;

/** Re-export getSupportedPlatforms from registry for backwards compatibility. */
export function getSupportedPlatforms() {
  return getRawSupportedPlatforms();
}

/**
 * Renders the platform icon at render time (not module init).
 * Safe for both server and client components — uses SSR icons.
 */
export function platformIcon(platform: string): ReactNode {
  const size = 'size-5';
  const componentName = getIconComponent(platform);
  switch (componentName) {
    case 'InstagramLogo': return <InstagramLogo className={size} weight="fill" />;
    case 'MetaLogo': return <MetaLogo className={size} weight="fill" />;
    case 'XLogo': return <XLogo className={size} weight="fill" />;
    case 'LinkedinLogo': return <LinkedinLogo className={size} weight="fill" />;
    case 'TiktokLogo': return <TiktokLogo className={size} weight="fill" />;
    case 'PinterestLogo': return <PinterestLogo className={size} weight="fill" />;
    case 'ThreadsLogo': return <ThreadsLogo className={size} weight="fill" />;
    case 'GoogleLogo': return <GoogleLogo className={size} weight="fill" />;
    case 'YoutubeLogo': return <YoutubeLogo className={size} weight="fill" />;
    case 'BlueskyLogo': return <ChatCircleText className={size} weight="fill" />; // Bluesky not in Phosphor, use chat icon as fallback
    default: return null;
  }
}

/** Small variant used in badges and chips. */
export function platformIconSm(platform: string): ReactNode {
  const size = 'size-3';
  const componentName = getIconComponent(platform);
  switch (componentName) {
    case 'InstagramLogo': return <InstagramLogo className={size} weight="fill" />;
    case 'MetaLogo': return <MetaLogo className={size} weight="fill" />;
    case 'XLogo': return <XLogo className={size} weight="fill" />;
    case 'LinkedinLogo': return <LinkedinLogo className={size} weight="fill" />;
    case 'TiktokLogo': return <TiktokLogo className={size} weight="fill" />;
    case 'PinterestLogo': return <PinterestLogo className={size} weight="fill" />;
    case 'ThreadsLogo': return <ThreadsLogo className={size} weight="fill" />;
    case 'GoogleLogo': return <GoogleLogo className={size} weight="fill" />;
    case 'YoutubeLogo': return <YoutubeLogo className={size} weight="fill" />;
    case 'BlueskyLogo': return <ChatCircleText className={size} weight="fill" />;
    default: return null;
  }
}
