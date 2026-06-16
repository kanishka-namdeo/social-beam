export interface PlatformCapability {
  syncMethod: 'api' | 'browser' | 'none';
  syncLabel: string;
  requiresSessionCookie?: boolean;
}

export const PLATFORM_CAPABILITIES: Record<string, PlatformCapability> = {
  linkedin:     { syncMethod: 'api',     syncLabel: 'Posts, analytics, engagement', requiresSessionCookie: true },
  instagram:    { syncMethod: 'api',     syncLabel: 'Media, insights, followers' },
  facebook:     { syncMethod: 'api',     syncLabel: 'Page posts, insights, followers' },
  x:            { syncMethod: 'api',     syncLabel: 'Tweets, metrics, followers' },
  tiktok:       { syncMethod: 'browser', syncLabel: 'Videos, engagement metrics' },
  pinterest:    { syncMethod: 'browser', syncLabel: 'Pins, saves, comments' },
  threads:      { syncMethod: 'browser', syncLabel: 'Posts, likes, replies' },
  youtube:      { syncMethod: 'browser', syncLabel: 'Community posts, comments' },
  bluesky:      { syncMethod: 'browser', syncLabel: 'Posts, likes, replies, mentions' },
  googleBusiness: { syncMethod: 'none',  syncLabel: 'No scraping available yet' },
};

export function getPlatformCapability(platform: string): PlatformCapability | null {
  return PLATFORM_CAPABILITIES[platform] ?? null;
}

export function isSyncAvailable(platform: string): boolean {
  const cap = getPlatformCapability(platform);
  return cap != null && cap.syncMethod !== 'none';
}
