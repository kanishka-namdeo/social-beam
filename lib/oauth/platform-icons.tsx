import { InstagramLogo, MetaLogo, XLogo, LinkedinLogo, TiktokLogo, PinterestLogo } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';

export const PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'pinterest'] as const;

export const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X / Twitter',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
};

/**
 * Renders the platform icon at render time (not module init).
 * Safe for both server and client components — uses SSR icons.
 */
export function platformIcon(platform: string): ReactNode {
  const size = 'size-5';
  switch (platform) {
    case 'instagram': return <InstagramLogo className={size} weight="fill" />;
    case 'facebook': return <MetaLogo className={size} weight="fill" />;
    case 'x': return <XLogo className={size} weight="fill" />;
    case 'linkedin': return <LinkedinLogo className={size} weight="fill" />;
    case 'tiktok': return <TiktokLogo className={size} weight="fill" />;
    case 'pinterest': return <PinterestLogo className={size} weight="fill" />;
    default: return null;
  }
}

/** Small variant used in badges and chips. */
export function platformIconSm(platform: string): ReactNode {
  const size = 'size-3';
  switch (platform) {
    case 'instagram': return <InstagramLogo className={size} weight="fill" />;
    case 'facebook': return <MetaLogo className={size} weight="fill" />;
    case 'x': return <XLogo className={size} weight="fill" />;
    case 'linkedin': return <LinkedinLogo className={size} weight="fill" />;
    case 'tiktok': return <TiktokLogo className={size} weight="fill" />;
    case 'pinterest': return <PinterestLogo className={size} weight="fill" />;
    default: return null;
  }
}
