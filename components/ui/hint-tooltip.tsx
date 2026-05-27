"use client";

import { Info, Lightbulb } from "@phosphor-icons/react/ssr";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HintTooltipProps {
  hint: string;
  icon?: "lightbulb" | "info";
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function HintTooltip({ hint, icon = "lightbulb", className, side = "top" }: HintTooltipProps) {
  const Icon = icon === "lightbulb" ? Lightbulb : Info;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Hint"
            className={cn(
              "inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help transition-colors hover:text-foreground",
              className,
            )}
          >
            <Icon className="size-3.5" weight="regular" />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm text-xs leading-relaxed">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
