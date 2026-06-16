"use client";

import Link from "next/link";
import { Sparkle, Cpu } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

interface StatusGroupProps {
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
  aiStatus?: "idle" | "working" | "waiting-for-review";
  reviewCount?: number;
}

function isStale(lastTrainedAt: Date | null): boolean {
  if (!lastTrainedAt) return false;
  const daysSince = (Date.now() - lastTrainedAt.getTime()) / 86400000;
  return daysSince > 60;
}

export function StatusGroup({
  brandContext,
  aiStatus = "idle",
  reviewCount = 0,
}: StatusGroupProps) {
  const { config } = useInvisibleAI();

  // Brand status logic
  const trainingStatus = brandContext?.trainingStatus ?? "untrained";
  const lastTrainedAt = brandContext?.lastTrainedAt ?? null;
  const businessName = brandContext?.businessName ?? "Brand";
  const stale = isStale(lastTrainedAt);

  let brandDotColor: string;
  let brandTooltipTitle: string;
  let brandTooltipDetail: string;

  if (!brandContext || trainingStatus === "untrained") {
    brandDotColor = "bg-muted";
    brandTooltipTitle = "Brand context not set";
    brandTooltipDetail = "Set up your brand for AI-powered content";
  } else if (trainingStatus === "needs_refresh") {
    brandDotColor = "bg-warning";
    brandTooltipTitle = businessName;
    brandTooltipDetail = "Needs attention — review suggestions";
  } else if (stale) {
    brandDotColor = "bg-destructive";
    brandTooltipTitle = businessName;
    brandTooltipDetail = `Last trained ${lastTrainedAt ? new Date(lastTrainedAt).toLocaleDateString() : "unknown"} — consider re-analyzing`;
  } else {
    brandDotColor = "bg-success";
    brandTooltipTitle = businessName;
    brandTooltipDetail = `Last trained ${lastTrainedAt ? new Date(lastTrainedAt).toLocaleDateString() : "unknown"}`;
  }

  // AI status logic
  const isWorking = aiStatus === "working";
  const needsReview = aiStatus === "waiting-for-review";

  const aiDotColor = needsReview
    ? "animate-pulse bg-brand"
    : isWorking
      ? "animate-pulse bg-warning"
      : "bg-success";

  const aiTooltipText = config.showAgentStatus
    ? (needsReview
      ? `${reviewCount} item${reviewCount !== 1 ? "s" : ""} need${reviewCount === 1 ? "s" : ""} your review`
      : isWorking
        ? "Agent is working..."
        : "Agent is ready")
    : (needsReview
      ? `${reviewCount} item${reviewCount !== 1 ? "s" : ""} need${reviewCount === 1 ? "s" : ""} your review`
      : isWorking
        ? "Working..."
        : "Ready");

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
        {/* Brand Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings/brand"
              className="flex items-center gap-1.5 rounded-sm px-2 py-0.5 hover:bg-muted transition-colors duration-[var(--duration-medium)] ease-[var(--ease-decelerate)]"
              aria-label={`Brand context: ${brandTooltipTitle}`}
            >
              <div
                className={`h-2 w-2 rounded-full ${brandDotColor}`}
                aria-hidden="true"
              />
              <Sparkle className="size-3.5 text-muted-foreground" weight="fill" aria-hidden="true" />
              <span className="text-xs text-muted-foreground hidden xl:inline">Brand</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{brandTooltipTitle}</p>
              <p className="text-xs text-muted-foreground">{brandTooltipDetail}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* AI Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center gap-1.5 rounded-sm px-2 py-0.5 hover:bg-muted transition-colors cursor-default"
              role="status"
              aria-live="polite"
            >
              <div
                className={`h-2 w-2 rounded-full ${aiDotColor}`}
                aria-hidden="true"
              />
              <Cpu className="size-3.5 text-muted-foreground" weight="fill" aria-hidden="true" />
              <span className="text-xs text-muted-foreground hidden xl:inline">AI</span>
              <span className="sr-only">{aiTooltipText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{aiTooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
