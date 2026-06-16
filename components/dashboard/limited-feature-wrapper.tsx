"use client";

import { InlineUpgradeNudge } from "./inline-upgrade-nudge";
import { cn } from "@/lib/utils";

interface LimitedFeatureWrapperProps {
  children: React.ReactNode;
  featureKey: string;
  featureName: string;
  className?: string;
  /** @deprecated kept for API compat — ignored */
  freeUses?: number;
  /** @deprecated kept for API compat — ignored */
  lockedOpacity?: number;
  isPremium: boolean;
}

/** @deprecated Use `FeatureGate` from `./feature-gate` with `variant="inline"` or `variant="card"` instead. */
export function LimitedFeatureWrapper({
  children,
  featureName,
  className,
  isPremium,
}: LimitedFeatureWrapperProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <InlineUpgradeNudge
        title={`${featureName} is a premium feature`}
        description="Unlock unlimited access to this feature and all other AI-powered tools."
        variant="card"
      />
    </div>
  );
}

/** @deprecated No-op — kept for backward compatibility. Always returns canUse: true. */
export function useFreeFeatureUsage(_featureKey: string, _freeUses: number = 1) {
  return { canUse: true, claim: () => {}, claimFreeUse: () => {} };
}
