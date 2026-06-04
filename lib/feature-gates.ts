import type { UserRole } from '@/lib/role-guard';

export type SubscriptionTier = 'FREE' | 'AI_STARTER' | 'AI_PRO';

export const FEATURE_FLAGS: Record<string, { minRole: UserRole; minTier?: SubscriptionTier }> = {
  aiCompose: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  aiSuggestions: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  brandVoiceTraining: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  analyticsRecommendations: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  inboxAiDrafts: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
  calendarAiInsights: { minRole: 'PREMIUM_USER', minTier: 'AI_STARTER' },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
