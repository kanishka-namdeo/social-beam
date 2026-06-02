"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HeatmapSlot } from "./types";

interface BestTimesHeatmapProps {
  data: HeatmapSlot[];
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const businessHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted/30";
  const ratio = value / max;
  if (ratio > 0.8) return "bg-brand";
  if (ratio > 0.6) return "bg-brand/80";
  if (ratio > 0.4) return "bg-brand/60";
  if (ratio > 0.2) return "bg-brand/40";
  if (ratio > 0.1) return "bg-brand/20";
  return "bg-muted/40";
}

function getHeatTextColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "text-muted-foreground";
  const ratio = value / max;
  if (ratio > 0.8) return "text-primary-foreground";
  if (ratio > 0.4) return "text-foreground";
  return "text-muted-foreground";
}

export function BestTimesHeatmap({ data }: BestTimesHeatmapProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-sm border border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-tight">Best Times to Post</CardTitle>
          <CardDescription>Engagement by day of week and hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center rounded-sm border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            No posting data available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build a map: dayOfWeek x hour -> avgEngagement
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

  // Find top slots for recommendation
  const sortedSlots = [...data].sort((a, b) => b.avgEngagement - a.avgEngagement);
  const topSlots = sortedSlots.slice(0, 5);

  return (
    <Card className="rounded-sm border border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">Best Times to Post</CardTitle>
        <CardDescription>Average engagement by day and hour</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="flex">
              <div className="w-12 shrink-0" />
              {businessHours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] font-mono tabular-nums text-muted-foreground"
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {/* Day rows */}
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
              <div key={dayIdx} className="flex items-center mt-px">
                <div className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
                  {dayLabels[dayIdx]}
                </div>
                {businessHours.map((hour) => {
                  const value = heatMap[dayIdx]?.[hour] ?? 0;
                  const isTopSlot = topSlots.some(
                    (t) => t.dayOfWeek === dayIdx && t.hour === hour
                  );

                  return (
                    <div
                      key={hour}
                  className={cn(
                    "flex-1 h-7 rounded-none flex items-center justify-center text-[10px] font-mono tabular-nums font-medium transition-colors",
                    getHeatColor(value, maxEngagement),
                    getHeatTextColor(value, maxEngagement),
                    isTopSlot && "ring-1 ring-brand ring-offset-1 ring-offset-background"
                  )}
                      title={`${dayLabels[dayIdx]} ${hour}:00 — Avg engagement: ${value.toFixed(1)}`}
                    >
                      {value > 0 && value.toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Top recommended times */}
        {topSlots.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Recommended Posting Times
            </p>
            <div className="flex flex-wrap gap-2">
              {topSlots.map((slot, i) => (
                <Badge
                  key={i}
                  variant="default"
                  className="rounded-sm text-xs normal-case tracking-normal gap-1"
                >
                  {dayLabels[slot.dayOfWeek]} {slot.hour}:00
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
