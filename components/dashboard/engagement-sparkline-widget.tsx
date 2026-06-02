"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, ChartLineUp } from "@phosphor-icons/react/ssr";

interface EngagementSparklineWidgetProps {
  data: Array<{
    date: string;
    engagementRate: number;
  }>;
}

function SparklineTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-sm border border-border bg-card p-2 shadow-lg">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          Engagement:{" "}
          <span className="font-medium font-mono tabular-nums text-foreground">
            {(payload[0].value * 100).toFixed(1)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
}

function calculateTrend(data: Array<{ engagementRate: number }>): {
  change: number;
  direction: "up" | "down" | "flat";
} {
  if (data.length < 14) {
    return { change: 0, direction: "flat" };
  }

  const recent7 = data.slice(-7).reduce((sum, d) => sum + d.engagementRate, 0) / 7;
  const previous7 = data.slice(-14, -7).reduce((sum, d) => sum + d.engagementRate, 0) / 7;

  if (previous7 === 0) {
    return { change: recent7 > 0 ? 100 : 0, direction: recent7 > 0 ? "up" : "flat" };
  }

  const change = ((recent7 - previous7) / previous7) * 100;
  const direction: "up" | "down" | "flat" =
    change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";

  return { change: Math.abs(change), direction };
}

export function EngagementSparklineWidget({
  data,
}: EngagementSparklineWidgetProps) {
  const trend = useMemo(() => calculateTrend(data), [data]);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
      engagementRate: d.engagementRate,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <ChartLineUp className="size-4 text-brand" weight="bold" />
          Engagement Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-28 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            No engagement data yet. Start posting to see trends.
          </p>
        </div>
      </CardContent>
    </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
            <ChartLineUp className="size-4 text-brand" weight="bold" />
            Engagement Trend
          </CardTitle>
          <div className="flex items-center gap-1 text-xs">
            {trend.direction === "up" && (
              <>
                <ArrowUpRight className="size-3 text-success" weight="bold" />
                <span className="font-medium font-mono tabular-nums text-success">
                  +{trend.change.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === "down" && (
              <>
                <ArrowDownRight className="size-3 text-destructive" weight="bold" />
                <span className="font-medium font-mono tabular-nums text-destructive">
                  -{trend.change.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === "flat" && (
              <>
                <Minus className="size-3 text-muted-foreground" weight="bold" />
                <span className="font-medium font-mono tabular-nums text-muted-foreground">
                  0.0%
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip content={<SparklineTooltipContent />} />
              <Line
                type="monotone"
                dataKey="engagementRate"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, stroke: "var(--brand)", strokeWidth: 2, fill: "var(--background)" }}
              />
            </LineChart>
          </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
