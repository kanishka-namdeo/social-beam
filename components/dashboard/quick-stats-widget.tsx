"use client";

import { CheckCircle, Clock, FileText, WarningCircle, ChartPieSlice } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface QuickStatsWidgetProps {
  stats: {
    totalPosts: number;
    scheduledCount: number;
    publishedThisWeek: number;
    failedCount: number;
  };
  size?: WidgetSizeToken;
}

export function QuickStatsWidget({ stats, size = "10x2" }: QuickStatsWidgetProps) {
  const { isCompact, isWide } = getSizeDerivatives(size);

  const isEmpty = stats.totalPosts === 0 && stats.scheduledCount === 0 && stats.publishedThisWeek === 0 && stats.failedCount === 0;

  const metrics = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      icon: FileText,
      colorClass: "text-foreground",
    },
    {
      label: "Scheduled",
      value: stats.scheduledCount,
      icon: Clock,
      colorClass: "text-post-queued",
    },
    {
      label: "Published This Week",
      value: stats.publishedThisWeek,
      icon: CheckCircle,
      colorClass: "text-success",
    },
    {
      label: "Failed",
      value: stats.failedCount,
      icon: WarningCircle,
      colorClass: "text-destructive",
    },
  ];

  return (
    <BaseWidget
      size={size}
      isEmpty={isEmpty}
      emptyState={{
        icon: <ChartPieSlice className="size-8" weight="light" />,
        message: "No stats yet",
        description: "Connect accounts and start posting to see stats.",
      }}
      header={{
        title: "Quick Stats",
        icon: <FileText className="size-4" weight="bold" />,
      }}
    >
        {isCompact ? (
          <div className="flex items-center gap-4 h-full px-2">
            {metrics.map(({ label, value, icon: Icon, colorClass }, idx) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-1.5 min-w-0",
                  idx < metrics.length - 1 && "border-r border-border/40 pr-4"
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", colorClass)} />
                <span className={cn("font-mono tabular-nums font-semibold text-sm", colorClass)}>
                  {value.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-xs truncate">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 h-full">
            {metrics.map(({ label, value, icon: Icon, colorClass }) => (
              <div
                key={label}
                className="rounded-sm border border-border bg-card p-3 flex flex-col justify-center min-h-0"
              >
                <Icon className={cn("size-4 text-muted-foreground mb-1")} />
                <div className={cn("font-mono tabular-nums font-semibold text-lg", colorClass)}>
                  {value.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs truncate mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
    </BaseWidget>
  );
}
