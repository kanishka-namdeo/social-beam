"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendUp,
  TrendDown,
  ChartLineUp,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export type TrendPhase = "emerging" | "peaking" | "declining";

interface TrendPhaseBadgeProps {
  phase: TrendPhase | string | null | undefined;
  className?: string;
}

const PHASE_CONFIG: Record<TrendPhase, { label: string; icon: React.ReactNode; description: string; classes: string }> = {
  emerging: {
    label: "Emerging",
    icon: <TrendUp className="size-3" weight="bold" />,
    description: "Rapidly gaining traction — early opportunity to engage before saturation",
    classes: "bg-success/10 text-success border-success/20",
  },
  peaking: {
    label: "Peaking",
    icon: <ChartLineUp className="size-3" weight="bold" />,
    description: "At maximum visibility — engage now while attention is highest",
    classes: "bg-warning/10 text-warning border-warning/20",
  },
  declining: {
    label: "Declining",
    icon: <TrendDown className="size-3" weight="bold" />,
    description: "Losing momentum — lower priority unless you have a unique angle",
    classes: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function TrendPhaseBadge({ phase, className }: TrendPhaseBadgeProps) {
  if (!phase || !PHASE_CONFIG[phase as TrendPhase]) {
    return null;
  }

  const config = PHASE_CONFIG[phase as TrendPhase];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("text-xs gap-1 cursor-help", config.classes, className)}
          >
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
