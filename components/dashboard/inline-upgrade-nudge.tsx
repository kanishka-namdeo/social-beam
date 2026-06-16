"use client";

import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface InlineUpgradeNudgeProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact" | "card";
}

export function InlineUpgradeNudge({
  title = "Premium Feature",
  description = "Upgrade to unlock this feature and grow your audience.",
  className,
  variant = "default",
}: InlineUpgradeNudgeProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Sparkle className="size-3.5 text-brand shrink-0" weight="fill" />
        <span>{description}</span>
        <Button asChild variant="link" className="h-auto p-0 text-xs text-brand hover:text-brand/80">
          <Link href="/billing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-sm border border-border bg-card p-4 text-center space-y-2", className)}>
        <Sparkle className="mx-auto size-6 text-brand" weight="fill" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button asChild size="sm" variant="default" className="mt-1">
          <Link href="/billing">Upgrade to Premium</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-sm border border-border bg-ai-surface/30 p-3 flex items-start gap-2.5", className)}>
      <Sparkle className="size-4 text-brand shrink-0 mt-0.5" weight="fill" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button asChild size="sm" variant="default" className="shrink-0">
        <Link href="/billing">Upgrade</Link>
      </Button>
    </div>
  );
}
