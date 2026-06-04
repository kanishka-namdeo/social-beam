"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InlineUpgradeNudge } from "./inline-upgrade-nudge";

interface LimitedFeatureWrapperProps {
  children: React.ReactNode;
  freeUses?: number;
  featureKey: string;
  featureName: string;
  className?: string;
  /** When all free uses are consumed, this is the fraction of children opacity to apply */
  lockedOpacity?: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getStorageKey(featureKey: string): string {
  return `premium_free_use_${featureKey}_${getTodayKey()}`;
}

function getUsageCount(featureKey: string): number {
  if (typeof window === "undefined") return 0;
  const key = getStorageKey(featureKey);
  const val = localStorage.getItem(key);
  return val ? parseInt(val, 10) : 0;
}

function incrementUsage(featureKey: string): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(featureKey);
  localStorage.setItem(key, String(getUsageCount(featureKey) + 1));
}

export function LimitedFeatureWrapper({
  children,
  freeUses = 1,
  featureKey,
  featureName,
  className,
  lockedOpacity = 0.4,
}: LimitedFeatureWrapperProps) {
  const [usageCount, setUsageCount] = useState(0);
  const [hasUsedFreeToday, setHasUsedFreeToday] = useState(false);

  useEffect(() => {
    const count = getUsageCount(featureKey);
    setUsageCount(count);
    setHasUsedFreeToday(count >= freeUses);
  }, [featureKey, freeUses]);

  const claimFreeUse = useCallback(() => {
    incrementUsage(featureKey);
    setUsageCount((prev) => prev + 1);
    if (usageCount + 1 >= freeUses) {
      setHasUsedFreeToday(true);
    }
  }, [featureKey, freeUses, usageCount]);

  if (!hasUsedFreeToday) {
    // Still has free uses remaining — render children normally, caller handles claimFreeUse
    return (
      <div className={cn("", className)} data-remaining-free={freeUses - usageCount}>
        {children}
      </div>
    );
  }

  // Free uses exhausted for today — show locked state
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-sm border border-border bg-background/60 backdrop-blur-sm">
        <Lock className="size-8 text-muted-foreground mb-2" weight="fill" />
        <p className="text-sm font-medium text-foreground mb-1">
          Free uses today exhausted
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          You&apos;ve used your {freeUses} free {featureName.toLowerCase()} today. Upgrade for unlimited access.
        </p>
        <Button asChild size="sm" variant="default">
          <Link href="/billing">Upgrade to Premium</Link>
        </Button>
      </div>
    </div>
  );
}

export function useFreeFeatureUsage(featureKey: string, freeUses: number = 1) {
  const [canUse, setCanUse] = useState(true);

  useEffect(() => {
    const count = getUsageCount(featureKey);
    setCanUse(count < freeUses);
  }, [featureKey, freeUses]);

  const claim = useCallback(() => {
    incrementUsage(featureKey);
    const count = getUsageCount(featureKey);
    setCanUse(count < freeUses);
  }, [featureKey, freeUses]);

  return { canUse, claim, claimFreeUse: claim };
}

export { InlineUpgradeNudge };
