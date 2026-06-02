"use client";

import { Sparkle } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

interface AIStatusIndicatorProps {
  status?: "idle" | "working" | "waiting-for-review";
  reviewCount?: number;
}

export function AIStatusIndicator({ status = "idle", reviewCount = 0 }: AIStatusIndicatorProps) {
  const { config } = useInvisibleAI();
  const isWorking = status === "working";
  const needsReview = status === "waiting-for-review";

  const dotColor = needsReview
    ? "animate-pulse bg-brand"
    : isWorking
      ? "animate-pulse bg-warning"
      : "bg-success";

  const tooltipText = config.showAgentStatus
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
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1.5 rounded-sm px-2 py-1 hover:bg-muted transition-colors"
            role="status"
            aria-live="polite"
          >
            <div
              className={`h-2 w-2 rounded-full ${dotColor}`}
              aria-hidden="true"
            />
            {config.showAgentStatus && (
              <Sparkle className="size-3.5 text-muted-foreground" weight="fill" aria-hidden="true" />
            )}
            <span className="sr-only">{tooltipText}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
