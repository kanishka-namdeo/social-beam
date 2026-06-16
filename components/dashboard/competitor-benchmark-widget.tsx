"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Trophy, Users, TrendUp } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { useWidgetDimensions } from "@/components/hooks/use-widget-dimensions";

interface CompetitorData {
  name: string;
  followers: number;
  engagementRate: number;
  postsPerWeek: number;
}

interface CompetitorBenchmarkWidgetProps {
  competitors: CompetitorData[];
  yourData: CompetitorData;
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

export function CompetitorBenchmarkWidget({
  competitors,
  yourData,
  isLoading,
  size = "5x3",
}: CompetitorBenchmarkWidgetProps) {
  const { isCompact, isWide, chartHeight } = useWidgetDimensions(size);

  const chartData = useMemo(() => {
    return [
      { ...yourData, name: "You" },
      ...competitors,
    ];
  }, [competitors, yourData]);

  const avgEngagement = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.engagementRate, 0) / competitors.length
    : 0;
  const yourAdvantage = yourData.engagementRate > avgEngagement
    ? ((yourData.engagementRate - avgEngagement) / avgEngagement) * 100
    : 0;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={competitors.length === 0}
      emptyState={{
        icon: <Trophy weight="light" />,
        message: "No competitors added",
        description: "Add competitors to see benchmark comparisons.",
      }}
      header={{
        title: "Competitor Benchmark",
        icon: <Trophy weight="bold" />,
        action: yourAdvantage > 0 ? (
          <div className="flex items-center gap-tight text-caption text-success">
            <TrendUp className="size-3" weight="bold" />
            <span className="font-medium font-mono tabular-nums">
              +{yourAdvantage.toFixed(0)}%
            </span>
            <span className="text-muted-foreground">vs avg</span>
          </div>
        ) : undefined,
      }}
      isLoading={isLoading}
    >
        <div className="space-y-panel">
          {/* Comparison chart */}
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-sm border border-border bg-card p-2 shadow-lg">
                        <p className="text-caption font-medium text-foreground">{label}</p>
                        <p className="text-caption text-muted-foreground">
                          Engagement: {" "}
                          <span className="font-mono tabular-nums text-foreground">
                            {(Number(payload[0].value) * 100).toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="engagementRate"
                fill="var(--chart-1)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Stats comparison */}
          {!isCompact && (
            <div className={cn(
              "grid gap-control",
              isWide ? "grid-cols-4" : "grid-cols-2"
            )}>
              <div className="rounded-sm border border-subtle bg-surface-1 p-2 min-w-0">
                <div className="flex items-center gap-tight text-caption text-muted-foreground min-w-0">
                  <Users className="size-3 shrink-0" />
                  <span className="truncate">Followers</span>
                </div>
                <p className="text-caption font-mono tabular-nums text-foreground mt-1 truncate">
                  {yourData.followers.toLocaleString()}
                </p>
              </div>
              <div className="rounded-sm border border-subtle bg-surface-1 p-2 min-w-0">
                <div className="flex items-center gap-tight text-caption text-muted-foreground min-w-0">
                  <TrendUp className="size-3 shrink-0" />
                  <span className="truncate">Engagement</span>
                </div>
                <p className="text-caption font-mono tabular-nums text-foreground mt-1 truncate">
                  {(yourData.engagementRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-sm border border-subtle bg-surface-1 p-2 min-w-0">
                <div className="flex items-center gap-tight text-caption text-muted-foreground min-w-0">
                  <Trophy className="size-3 shrink-0" />
                  <span className="truncate">Posts/Week</span>
                </div>
                <p className="text-caption font-mono tabular-nums text-foreground mt-1 truncate">
                  {yourData.postsPerWeek}
                </p>
              </div>
              <div className="rounded-sm border border-subtle bg-surface-1 p-2 min-w-0">
                <div className="flex items-center gap-tight text-caption text-muted-foreground min-w-0">
                  <Trophy className="size-3 shrink-0" />
                  <span className="truncate">Competitors</span>
                </div>
                <p className="text-caption font-mono tabular-nums text-foreground mt-1 truncate">
                  {competitors.length}
                </p>
              </div>
            </div>
          )}
        </div>
    </BaseWidget>
  );
}
