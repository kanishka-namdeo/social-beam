"use client";

import Link from "next/link";
import { Sparkle, Clock, Warning, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BrandContextStatusBannerProps {
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
}

const DISMISSED_KEY = "social-beam-brand-status-dismissed";

function isStale(lastTrainedAt: Date | null): boolean {
  if (!lastTrainedAt) return false;
  const daysSince = (Date.now() - lastTrainedAt.getTime()) / 86400000;
  return daysSince > 60;
}

export function BrandContextStatusBanner({ brandContext }: BrandContextStatusBannerProps) {
  const trainingStatus = brandContext?.trainingStatus ?? "untrained";
  const lastTrainedAt = brandContext?.lastTrainedAt ?? null;
  const stale = isStale(lastTrainedAt);
  const isMissing = brandContext === null;
  const isUntrained = trainingStatus === "untrained";
  const needsRefresh = trainingStatus === "needs_refresh";
  const isHealthy = trainingStatus === "trained" && !stale;

  if (isHealthy) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    window.dispatchEvent(new CustomEvent("brand-status-dismissed"));
    toast.info("Banner dismissed. You can always set up brand context later in Settings.");
  };

  let icon: React.ReactNode;
  let title: string;
  let description: string;
  let actionLabel: string;
  let actionHref: string;
  let borderColor: string;
  let bgColor: string;

  if (isMissing) {
    icon = <Sparkle className="size-5 text-brand mt-0.5 shrink-0" weight="fill" />;
    title = "Set up your brand context";
    description = "Tell us about your brand and the AI will auto-generate your voice, audience, and platform strategy — in about 30 seconds.";
    actionLabel = "Set up brand context";
    actionHref = "/settings/brand";
    borderColor = "border-l-brand";
    bgColor = "bg-brand/5";
  } else if (stale) {
    icon = <Warning className="size-5 text-destructive mt-0.5 shrink-0" weight="fill" />;
    const trainedDate = lastTrainedAt ? new Date(lastTrainedAt).toLocaleDateString() : "a while ago";
    title = "Brand context may be outdated";
    description = `Your brand profile was last analyzed on ${trainedDate}. Re-analyze to capture any changes in your brand voice or strategy.`;
    actionLabel = "Re-analyze brand";
    actionHref = "/settings/brand?mode=reanalyze";
    borderColor = "border-l-destructive";
    bgColor = "bg-destructive/5";
  } else if (needsRefresh) {
    icon = <Warning className="size-5 text-warning mt-0.5 shrink-0" weight="fill" />;
    title = "Brand context needs attention";
    description = "Your brand profile has signals that need review. Update your context to improve AI-generated content.";
    actionLabel = "Review suggestions";
    actionHref = "/settings/brand";
    borderColor = "border-l-warning";
    bgColor = "bg-warning/5";
  } else {
    icon = <Clock className="size-5 text-muted-foreground mt-0.5 shrink-0" />;
    title = isUntrained ? "Start brand analysis" : "Brand context incomplete";
    description = "Your brand context hasn't been analyzed yet. Paste your website URL and the AI will handle the rest.";
    actionLabel = "Start analysis";
    actionHref = "/settings/brand";
    borderColor = "border-l-muted";
    bgColor = "bg-muted/30";
  }

  return (
    <div
      className={`relative rounded-sm border border-border/60 border-l-4 ${borderColor} ${bgColor} p-4`}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute top-2.5 right-2.5 p-1 rounded-sm hover:bg-muted transition-colors min-h-10 min-w-10 flex items-center justify-center"
      >
        <X className="size-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default" size="sm" asChild className="min-h-9 rounded-sm">
              <Link href={actionHref}>
                {actionLabel}
                <Sparkle className="size-3.5 ml-1" weight="fill" />
              </Link>
            </Button>
            <Badge variant="secondary" className="min-h-6 rounded-sm">
              <Clock className="size-3 mr-1" />
              ~30 seconds
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
