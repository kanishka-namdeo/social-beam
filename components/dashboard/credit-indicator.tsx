"use client";

import { Coin, Warning } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditIndicatorProps {
  balance: number;
}

function getTooltipText(balance: number): string {
  if (balance > 10) return "AI Credits remaining";
  if (balance >= 6) return "AI Credits — running low";
  if (balance >= 1) return "AI Credits — very low! Top up soon";
  return "No credits remaining";
}

export function CreditIndicator({ balance }: CreditIndicatorProps) {
  const colorClass =
    balance > 10
      ? "text-success"
      : balance >= 1
        ? "text-warning"
        : "text-destructive";

  const showPulse = balance <= 5 && balance > 0;
  const showRedDot = balance === 0;
  const tooltipText = getTooltipText(balance);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent">
            <Coin
              className={`size-4 text-brand ${showPulse ? "animate-pulse" : ""}`}
              weight="bold"
            />
            <span className={colorClass}>{balance}</span>
            {showRedDot && (
              <Warning
                className="size-3 animate-pulse text-destructive"
                weight="fill"
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
