"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";
import { useWidgetDimensions } from "@/components/hooks/use-widget-dimensions";

interface HeatmapSlot {
  dayOfWeek: number;
  hour: number;
  avgEngagement: number;
}

interface BestTimeToPostWidgetProps {
  data: HeatmapSlot[];
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-surface-1";
  const ratio = value / max;
  if (ratio > 0.8) return "bg-chart-1";
  if (ratio > 0.6) return "bg-chart-1/80";
  if (ratio > 0.4) return "bg-chart-1/60";
  if (ratio > 0.2) return "bg-chart-1/40";
  return "bg-chart-1/20";
}

function getHeatTextColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "text-muted-foreground";
  const ratio = value / max;
  if (ratio > 0.6) return "text-primary-foreground";
  return "text-foreground";
}

export function BestTimeToPostWidget({
  data,
  isLoading,
  size = "5x2",
}: BestTimeToPostWidgetProps) {
  const { isCompact, isWide, isNarrow } = getSizeDerivatives(size);
  const { chartHeight } = useWidgetDimensions(size);
  const cellHeight = Math.max(20, chartHeight / 7);

  const isEmpty = data.length === 0;

  // Build heatmap data
  const heatMap: Record<number, Record<number, number>> = {};
  let maxEngagement = 0;

  for (const slot of data) {
    if (!heatMap[slot.dayOfWeek]) {
      heatMap[slot.dayOfWeek] = {};
    }
    heatMap[slot.dayOfWeek][slot.hour] = slot.avgEngagement;
    if (slot.avgEngagement > maxEngagement) {
      maxEngagement = slot.avgEngagement;
    }
  }

  // Find top slots
  const sortedSlots = [...data].sort((a, b) => b.avgEngagement - a.avgEngagement);
  const topSlots = sortedSlots.slice(0, isWide ? 6 : 3);

  // Compact: core business hours (10-14); narrow: hide heatmap entirely
  const hoursToShow = isCompact ? [10, 11, 12, 13, 14] : isWide ? businessHours : businessHours.slice(2, 7);
  const showHeatmap = !isNarrow;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={isEmpty}
      emptyState={{
        icon: <Timer className="size-8" weight="light" />,
        message: "No posting data available yet",
        description: "Post consistently to discover optimal times.",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: "Best Time to Post",
        icon: <Clock />,
      }}
      isLoading={isLoading}
    >
      <div className="space-y-section">
        {/* Heatmap grid */}
        {showHeatmap && (
          <div className="overflow-hidden">
            <div className="w-full">
              {/* Header row */}
              <div className="flex">
                <div className="min-w-10 flex-shrink-0" />
                {hoursToShow.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 min-w-0 text-center text-micro font-mono tabular-nums text-muted-foreground truncate"
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* Day rows */}
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                <div key={dayIdx} className="flex items-center mt-px">
                  <div className="min-w-10 flex-shrink-0 text-caption font-medium text-muted-foreground truncate">
                    {dayLabels[dayIdx]}
                  </div>
                  {hoursToShow.map((hour) => {
                    const value = heatMap[dayIdx]?.[hour] ?? 0;
                    const isTopSlot = topSlots.some(
                      (t) => t.dayOfWeek === dayIdx && t.hour === hour
                    );

                    return (
                      <div
                        key={hour}
                        className={cn(
                          "flex-1 rounded-sm flex items-center justify-center text-micro font-mono tabular-nums font-medium transition-colors min-w-0",
                          getHeatColor(value, maxEngagement),
                          getHeatTextColor(value, maxEngagement),
                          isTopSlot && "ring-1 ring-brand ring-offset-1"
                        )}
                        style={{ height: `${cellHeight}px` }}
                        title={`${dayLabels[dayIdx]} ${hour}:00 — Avg engagement: ${value.toFixed(1)}`}
                      >
                        {value > 0 && !isCompact && value.toFixed(0)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top recommended times */}
        {topSlots.length > 0 && (
          <div className="space-y-control pt-control">
            <p className="text-caption font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
              Recommended Times
            </p>
            <div className="flex flex-wrap gap-control min-w-0">
              {topSlots.map((slot, i) => (
                <Badge
                  key={i}
                  variant="default"
                  className="rounded-sm text-caption normal-case tracking-normal gap-control truncate max-w-full"
                >
                  {dayLabels[slot.dayOfWeek]} {slot.hour}:00
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
