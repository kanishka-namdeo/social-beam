"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EngagementDepthChartProps {
  commentCount: number;
  maxDepth?: number;
  className?: string;
}

const DEPTH_LEVELS = [
  { label: "Top-level", color: "bg-muted-foreground/40" },
  { label: "Replies", color: "bg-info/60" },
  { label: "Deep", color: "bg-success/60" },
  { label: "Very deep", color: "bg-success" },
];

function computeDepthDistribution(commentCount: number, maxDepth: number): number[] {
  if (commentCount === 0) return [0, 0, 0, 0];

  const top = Math.round(commentCount * 0.4);
  const replies = Math.round(commentCount * 0.3);
  const deep = Math.round(commentCount * 0.2);
  const veryDeep = Math.max(0, commentCount - top - replies - deep);

  return [top, replies, deep, veryDeep];
}

function getDepthScore(commentCount: number, maxDepth: number): number {
  if (commentCount === 0) return 0;
  const countScore = Math.min(commentCount / 100, 1) * 0.5;
  const depthScore = Math.min(maxDepth / 5, 1) * 0.5;
  return countScore + depthScore;
}

export function EngagementDepthChart({ commentCount, maxDepth = 0, className }: EngagementDepthChartProps) {
  const distribution = computeDepthDistribution(commentCount, maxDepth);
  const maxVal = Math.max(...distribution, 1);
  const depthScore = getDepthScore(commentCount, maxDepth);
  const isHighEngagement = maxDepth >= 3 || depthScore >= 0.6;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-end gap-0.5 h-6 cursor-help", className)}>
            {distribution.map((val, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 rounded-t-sm transition-all",
                  DEPTH_LEVELS[i].color,
                  val === 0 && "bg-muted/30",
                )}
                style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 15 : 8)}%` }}
              />
            ))}
            {isHighEngagement && (
              <span className="ml-1 text-[10px] font-medium text-success leading-none">
                Deep
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs space-y-1">
          <p className="font-medium">Engagement depth</p>
          <p className="text-muted-foreground">
            {commentCount} comments, max depth {maxDepth}
          </p>
          {isHighEngagement && (
            <p className="text-success">
              High engagement = active discussion = better opportunity
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
