"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, TrendUp, TrendDown, ChartLineUp } from "@phosphor-icons/react/ssr";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { useWidgetDimensions } from "@/components/hooks/use-widget-dimensions";

interface FollowerGrowthWidgetProps {
  data: Array<{
    date: string;
    followers: number;
  }>;
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

function calculateGrowth(data: Array<{ followers: number }>): {
  total: number;
  change: number;
  direction: "up" | "down" | "flat";
} {
  if (data.length < 2) {
    return { total: data[0]?.followers ?? 0, change: 0, direction: "flat" };
  }

  const current = data[data.length - 1].followers;
  const previous = data[0].followers;

  if (previous === 0) {
    return { total: current, change: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "flat" };
  }

  const change = ((current - previous) / previous) * 100;
  const direction: "up" | "down" | "flat" =
    change > 0.1 ? "up" : change < -0.1 ? "down" : "flat";

  return { total: current, change: Math.abs(change), direction };
}

export function FollowerGrowthWidget({
  data,
  isLoading,
  size = "5x2",
}: FollowerGrowthWidgetProps) {
  const { isCompact, isNarrow, isWide, chartHeight } = useWidgetDimensions(size);

  const growth = useMemo(() => calculateGrowth(data), [data]);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      followers: d.followers,
    }));
  }, [data]);

  const isEmpty = data.length === 0;

  const trendAction = !isNarrow && !isEmpty && growth.direction !== "flat" ? (
    <div className="flex items-center gap-1 text-caption">
      {growth.direction === "up" && (
        <>
          <TrendUp className="size-3 text-success" weight="bold" />
          <span className="font-medium font-mono tabular-nums text-success">
            +{growth.change.toFixed(1)}%
          </span>
        </>
      )}
      {growth.direction === "down" && (
        <>
          <TrendDown className="size-3 text-destructive" weight="bold" />
          <span className="font-medium font-mono tabular-nums text-destructive">
            -{growth.change.toFixed(1)}%
          </span>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={isEmpty}
      emptyState={{
        icon: <ChartLineUp className="size-8" weight="light" />,
        message: "No follower data yet",
        description: "Connect your accounts to track follower growth.",
        cta: {
          label: "Connect Account",
          href: "/settings/accounts",
        },
      }}
      header={{
        title: isCompact ? "" : "Follower Growth",
        icon: <Users />,
        action: trendAction,
      }}
      isLoading={isLoading}
    >
      {isNarrow || isCompact ? (
        <div className="flex flex-col items-center justify-center h-full">
          <span className="font-mono text-heading tabular-nums text-foreground">
            {growth.total.toLocaleString()}
          </span>
          <span className="text-caption text-muted-foreground">followers</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData}>
            {!isCompact && (
              <XAxis
                dataKey="date"
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
            )}
            {!isCompact && (
              <YAxis
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
            )}
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-sm border border-border bg-card p-2 shadow-md">
                      <p className="text-caption font-medium text-foreground">{label}</p>
                      <p className="text-caption text-muted-foreground">
                        Followers:{" "}
                        <span className="font-mono tabular-nums text-foreground">
                          {Number(payload[0].value).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="followers"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--background)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </BaseWidget>
  );
}
