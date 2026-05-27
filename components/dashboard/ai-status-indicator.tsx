"use client";

import { Sparkle } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIStatusIndicatorProps {
  status?: "idle" | "working" | "waiting-for-review";
}

export function AIStatusIndicator({ status = "idle" }: AIStatusIndicatorProps) {
  const isWorking = status === "working";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors"
            role="status"
            aria-live="polite"
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isWorking ? "animate-pulse bg-warning" : "bg-success"
              }`}
              aria-hidden="true"
            />
            <Sparkle className="size-3.5 text-muted-foreground" weight="fill" aria-hidden="true" />
            <span className="sr-only">
              {status === "working"
                ? "AI agent is working"
                : status === "waiting-for-review"
                  ? "AI is waiting for your review"
                  : "AI agent is ready"}
            </span>
            <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">AI</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "working"
              ? "AI agent is working..."
              : status === "waiting-for-review"
                ? "AI is waiting for your review"
                : "AI agent is ready"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
