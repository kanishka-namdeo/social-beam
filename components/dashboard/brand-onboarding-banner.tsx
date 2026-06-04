"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkle,
  TrendUp,
  ChartBar,
  Calendar,
  Clock,
  LinkSimple,
  X,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

const POWERS = [
  {
    icon: Sparkle,
    title: "AI Compose",
    description: "Generates on-brand content automatically",
  },
  {
    icon: TrendUp,
    title: "Trend Research",
    description: "Filters trends relevant to your industry",
  },
  {
    icon: ChartBar,
    title: "Analytics",
    description: "Measures what matters to your goals",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    description: "Optimizes timing for your audience",
  },
];

export function BrandOnboardingBanner({
  onGetStarted,
  initialDismissed = false,
}: {
  onGetStarted: () => void;
  initialDismissed?: boolean;
}) {
  const [dismissed, setDismissed] = useState(initialDismissed);

  const handleDismiss = async () => {
    try {
      await fetch("/api/preferences/dismiss-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner: "brand-onboarding" }),
      });
    } catch {
      toast.error("Failed to save preference. Please try again.");
      return;
    }
    setDismissed(true);
    toast.info(
      "Onboarding skipped. You can always complete it later in Settings."
    );
  };

  if (dismissed) {
    return null;
  }

  return (
    <Card className="rounded-sm border-l-2 border-l-brand relative">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute top-3 right-3 p-1 rounded-sm hover:bg-muted transition-colors min-h-10 min-w-10 flex items-center justify-center"
      >
        <X className="size-4 text-muted-foreground" />
      </button>

      <CardContent className="pt-6 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            <h3 className="text-lg font-semibold text-foreground">
              Set up your brand context
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Brand context powers everything in Social Beam. Tell us about your
            brand and the AI handles the rest.
          </p>
        </div>

        {/* What this powers — 2x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POWERS.map((power) => {
            const Icon = power.icon;
            return (
              <div
                key={power.title}
                className="flex items-start gap-3 rounded-sm border border-border bg-card p-3"
              >
                <div className="rounded-sm bg-brand/10 p-1.5 mt-0.5">
                  <Icon className="size-4 text-brand" weight="duotone" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {power.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {power.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Social proof + CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 min-h-6 rounded-sm"
            >
              <Clock className="size-3" />
              ~30 seconds
            </Badge>
            <Badge
              variant="secondary"
              className="flex items-center gap-1 min-h-6 rounded-sm"
            >
              <LinkSimple className="size-3" />
              Just paste your website URL
            </Badge>
          </div>
          <Button onClick={onGetStarted} className="min-h-10 rounded-sm">
            Set up your brand context
            <Sparkle className="size-4 ml-1" weight="fill" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
