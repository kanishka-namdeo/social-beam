"use client";

import { Lock, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InlineUpgradeNudge } from "./inline-upgrade-nudge";

interface FeatureGateProps {
  isPremium: boolean;
  featureName: string;
  description?: string;
  previewDescription?: string;
  variant?: "inline" | "card" | "overlay";
  children?: React.ReactNode;
  className?: string;
}

/**
 * Unified gate for premium features. Renders `children` when `isPremium`;
 * otherwise shows an upsell UI whose shape is controlled by `variant`.
 *
 * - `inline`  — compact nudge for tight spaces (compose form, sidebars)
 * - `card`    — centered card with icon + button (settings, tabs)
 * - `overlay` — clean preview card with no blur (widgets, analytics)
 */
export function FeatureGate({
  isPremium,
  featureName,
  description,
  previewDescription,
  variant = "overlay",
  children,
  className,
}: FeatureGateProps) {
  if (isPremium) return <>{children}</>;

  if (variant === "inline") {
    return (
      <InlineUpgradeNudge
        title={featureName}
        description={description ?? `Unlock ${featureName} to create better content and grow your audience.`}
        variant="compact"
        className={className}
      />
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("border-border bg-card", className)}>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <Sparkle className="size-7 text-brand" weight="fill" />
          <p className="text-sm font-semibold text-foreground">{featureName}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {description ?? `Unlock ${featureName} to create better content and grow your audience.`}
          </p>
          <Button asChild size="sm" variant="default" className="mt-1">
            <Link href="/billing">Upgrade to Premium</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // overlay — clean preview card, NO blur, NO children rendered
  return (
    <Card className={cn("border-border bg-card", className)}>
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
          <Sparkle className="size-6 text-brand" weight="fill" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">{featureName}</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {previewDescription ?? description ?? `Unlock ${featureName} to create better content and grow your audience.`}
          </p>
        </div>
        <Button asChild size="sm" variant="default" className="mt-2">
          <Link href="/billing">Upgrade to unlock</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
