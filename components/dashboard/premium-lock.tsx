"use client";

import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/use-premium";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PremiumLockProps {
  children: React.ReactNode;
  featureName: string;
  className?: string;
}

/** @deprecated Use `FeatureGate` from `./feature-gate` with `variant="overlay"` instead. */
export function PremiumLock({ children, featureName, className }: PremiumLockProps) {
  const { isPremium } = usePremium();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 z-overlay flex flex-col items-center justify-center rounded-sm border border-border bg-background/60 backdrop-blur-sm">
        <Lock className="size-8 text-muted-foreground mb-2" weight="fill" />
        <p className="text-sm font-medium text-foreground mb-1">{featureName} requires Premium</p>
        <p className="text-xs text-muted-foreground mb-3">Unlock {featureName} to create better content and grow your audience.</p>
        <Button asChild size="sm" variant="default">
          <Link href="/billing">Upgrade to Premium</Link>
        </Button>
      </div>
      <div className="pointer-events-none opacity-50 blur-[1px]" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
