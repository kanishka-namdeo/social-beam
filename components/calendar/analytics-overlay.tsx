"use client";

import { ChartBar } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function getPerformanceColor(engagementRate: number): string {
  if (engagementRate > 5) return "border-l-success";
  if (engagementRate >= 2) return "border-l-warning";
  return "border-l-muted-foreground";
}

export interface PostAnalytics {
  impressions: number;
  engagementRate: number;
  likes: number;
  comments: number;
}

export function PerformanceTooltip({ analytics }: { analytics: PostAnalytics }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">Performance</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-micro">
        <span className="text-muted-foreground">Impressions</span>
        <span className="tabular-nums">{analytics.impressions.toLocaleString()}</span>
        <span className="text-muted-foreground">Engagement</span>
        <span className="tabular-nums">{analytics.engagementRate.toFixed(1)}%</span>
        <span className="text-muted-foreground">Likes</span>
        <span className="tabular-nums">{analytics.likes.toLocaleString()}</span>
        <span className="text-muted-foreground">Comments</span>
        <span className="tabular-nums">{analytics.comments.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface AnalyticsOverlayProps {
  active: boolean;
  onToggle: () => void;
}

export function AnalyticsOverlay({ active, onToggle }: AnalyticsOverlayProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            active && "bg-brand hover:bg-brand/90"
          )}
          onClick={onToggle}
          aria-pressed={active}
        >
          <ChartBar className="size-4" weight={active ? "fill" : "regular"} />
          <span className="hidden sm:inline">Performance</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {active ? "Hide performance metrics" : "Show performance metrics"}
      </TooltipContent>
    </Tooltip>
  );
}
