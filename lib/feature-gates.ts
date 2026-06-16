import type { UserRole } from '@/lib/role-guard';

export type SubscriptionTier = 'FREE' | 'AI_STARTER' | 'AI_PRO';

export const FEATURE_FLAGS: Record<string, { minRole: UserRole; minTier?: SubscriptionTier }> = {
  aiCompose: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  aiSuggestions: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  brandVoiceTraining: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  analyticsRecommendations: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  inboxAiDrafts: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  calendarAiInsights: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  customSignature: { minRole: 'PREMIUM_USER' },
  campaigns: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  redditRadar: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  advancedAnalytics: { minRole: 'PREMIUM_USER', minTier: 'AI_PRO' },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const TIER_LIMITS = {
  FREE: {
    maxAccounts: 2,
    maxPostsPerMonth: 10,
    maxScheduledPosts: 5,
    maxBrandVoiceTraining: 0,
    maxCampaigns: 0,
  },
  AI_STARTER: {
    maxAccounts: 10,
    maxPostsPerMonth: 100,
    maxScheduledPosts: 50,
    maxBrandVoiceTraining: 3,
    maxCampaigns: 5,
  },
  AI_PRO: {
    maxAccounts: -1, // unlimited
    maxPostsPerMonth: -1, // unlimited
    maxScheduledPosts: -1, // unlimited
    maxBrandVoiceTraining: -1, // unlimited
    maxCampaigns: -1, // unlimited
  },
} as const;

export type TierLimitKey = keyof typeof TIER_LIMITS;
export type LimitKey = keyof typeof TIER_LIMITS.FREE;

export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier as TierLimitKey];
}

export function checkLimit(tier: SubscriptionTier, limitKey: LimitKey, currentValue: number): boolean {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey] as number;
  if (limit === -1) return true; // unlimited
  return currentValue < limit;
}
