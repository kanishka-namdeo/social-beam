"use client";

import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BrandStatusPillProps {
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
}

function isStale(lastTrainedAt: Date | null): boolean {
  if (!lastTrainedAt) return false;
  const daysSince = (Date.now() - lastTrainedAt.getTime()) / 86400000;
  return daysSince > 60;
}

export function BrandStatusPill({ brandContext }: BrandStatusPillProps) {
  const trainingStatus = brandContext?.trainingStatus ?? "untrained";
  const lastTrainedAt = brandContext?.lastTrainedAt ?? null;
  const businessName = brandContext?.businessName ?? "Brand";
  const stale = isStale(lastTrainedAt);

  let dotColor: string;
  let tooltipTitle: string;
  let tooltipDetail: string;

  if (!brandContext || trainingStatus === "untrained") {
    dotColor = "bg-muted";
    tooltipTitle = "Brand context not set";
    tooltipDetail = "Set up your brand for AI-powered content";
  } else if (trainingStatus === "needs_refresh") {
    dotColor = "bg-warning";
    tooltipTitle = businessName;
    tooltipDetail = "Needs attention — review suggestions";
  } else if (stale) {
    dotColor = "bg-destructive";
    tooltipTitle = businessName;
    tooltipDetail = `Last trained ${lastTrainedAt ? new Date(lastTrainedAt).toLocaleDateString() : "unknown"} — consider re-analyzing`;
  } else {
    dotColor = "bg-success";
    tooltipTitle = businessName;
    tooltipDetail = `Last trained ${lastTrainedAt ? new Date(lastTrainedAt).toLocaleDateString() : "unknown"}`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/settings/brand"
            className="flex items-center gap-1.5 rounded-sm px-2 py-1 hover:bg-muted transition-colors duration-[var(--duration-medium)] ease-[var(--ease-decelerate)]"
            aria-label={`Brand context: ${tooltipTitle}`}
          >
            <div
              className={`h-2 w-2 rounded-full ${dotColor}`}
              aria-hidden="true"
            />
            <Sparkle className="size-3.5 text-muted-foreground" weight="fill" aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{tooltipTitle}</p>
            <p className="text-xs text-muted-foreground">{tooltipDetail}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
