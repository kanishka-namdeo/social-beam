"use client";

import { useId } from "react";
import { Info, Lightbulb } from "@phosphor-icons/react/ssr";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HintTooltipProps {
  hint: string;
  icon?: "lightbulb" | "info";
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: string[];
}

export function HintTooltip({ hint, icon = "lightbulb", className, side = "top", shortcut }: HintTooltipProps) {
  const Icon = icon === "lightbulb" ? Lightbulb : Info;
  const triggerId = useId();

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            id={triggerId}
            role="img"
            aria-label="Hint"
            tabIndex={0}
            className={cn(
              "inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm",
              className,
            )}
          >
            <Icon className="size-3.5" weight="regular" />
            {shortcut && (
              <span className="flex gap-0.5">
                {shortcut.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex min-w-[18px] items-center justify-center rounded-sm border border-border/50 bg-muted px-1 text-micro font-mono text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm text-xs leading-relaxed" aria-describedby={triggerId}>
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
