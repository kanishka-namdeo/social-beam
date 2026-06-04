"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeatureTeaserProps {
  children: React.ReactNode;
  featureName: string;
  className?: string;
  badgePosition?: "top-right" | "top-left";
  onPremiumAction?: () => void;
}

export function FeatureTeaser({
  children,
  featureName,
  className,
  badgePosition = "top-right",
  onPremiumAction,
}: FeatureTeaserProps) {
  const [showNudge, setShowNudge] = useState(false);

  const handleClick = () => {
    if (onPremiumAction) {
      onPremiumAction();
    } else {
      setShowNudge(true);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Badge
          variant="secondary"
          className={cn(
            "pointer-events-auto cursor-pointer gap-1 normal-case bg-brand/10 text-brand border-brand/20 hover:bg-brand/20 transition-colors duration-[var(--duration-medium)] ease-[var(--ease-decelerate)]",
            badgePosition === "top-right" && "top-2 right-2",
            badgePosition === "top-left" && "top-2 left-2",
          )}
          onClick={handleClick}
        >
          <Sparkle className="size-3" weight="fill" />
          {featureName}
        </Badge>
      </div>
      {showNudge && (
        <div className="mt-3 pointer-events-auto">
          <div className="rounded-sm border border-border bg-ai-surface/30 p-3 flex items-start gap-2.5">
            <Sparkle className="size-4 text-brand shrink-0 mt-0.5" weight="fill" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{featureName} is a Premium feature</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade to unlock the full experience.</p>
            </div>
            <a
              href="/billing"
              className="shrink-0 text-sm font-medium text-brand hover:underline"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
