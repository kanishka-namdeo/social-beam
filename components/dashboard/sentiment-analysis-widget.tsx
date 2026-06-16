"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Smiley, SmileyMeh, SmileySad, SmileySticker } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { useWidgetDimensions } from "@/components/hooks/use-widget-dimensions";

interface SentimentAnalysisWidgetProps {
  data: {
    positive: number;
    neutral: number;
    negative: number;
  };
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

const SENTIMENT_COLORS = {
  positive: "var(--success)",
  neutral: "var(--muted-foreground)",
  negative: "var(--destructive)",
};

export function SentimentAnalysisWidget({
  data,
  isLoading,
  size = "5x3",
}: SentimentAnalysisWidgetProps) {
  const { isCompact, isNarrow, isWide, chartHeight } = useWidgetDimensions(size);

  const chartData = useMemo(() => [
    { name: "Positive", value: data.positive, color: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: data.neutral, color: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: data.negative, color: SENTIMENT_COLORS.negative },
  ], [data]);

  const total = data.positive + data.neutral + data.negative;
  const dominant = total > 0
    ? data.positive >= data.neutral && data.positive >= data.negative
      ? "positive"
      : data.negative >= data.positive && data.negative >= data.neutral
        ? "negative"
        : "neutral"
    : "neutral";

  const isEmpty = total === 0;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={isEmpty}
      emptyState={{
        icon: <SmileySticker className="size-8" weight="light" />,
        message: "No sentiment data available",
        description: "Engagement data is needed to analyze sentiment.",
      }}
      header={{
        title: "Sentiment Analysis",
        icon: <SmileyMeh />,
      }}
      isLoading={isLoading}
    >
      <div className={cn("flex gap-panel", isNarrow ? "flex-col items-center" : "flex-row items-center")}>
        {/* Donut chart */}
        <div className="flex-1 min-w-0" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={Math.max(20, chartHeight * 0.25)}
                outerRadius={Math.max(30, chartHeight * 0.4)}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    return (
                      <div className="rounded-sm border border-border bg-card p-2 shadow-md">
                        <p className="text-caption font-medium text-foreground">{item.name}</p>
                        <p className="text-caption text-muted-foreground">
                          <span className="font-mono tabular-nums text-foreground">
                            {Number(item.value).toLocaleString()}
                          </span>
                          {" "}({((Number(item.value) / total) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        {!isCompact && (
          <div className={cn(
            "flex flex-col gap-control",
            isNarrow ? "w-full mt-2" : "shrink-0"
          )}>
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-control min-w-0">
                <span
                  className="size-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-caption text-muted-foreground flex-1 min-w-0 truncate">{item.name}</span>
                <span className="text-caption font-mono tabular-nums text-foreground shrink-0">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}

            {/* Dominant sentiment indicator */}
            <div className="mt-section pt-section border-t border-subtle">
              <div className="flex items-center gap-control">
                {dominant === "positive" && (
                  <>
                    <Smiley className="size-5 text-success shrink-0" weight="fill" />
                    <span className="text-caption text-success font-medium truncate">Mostly Positive</span>
                  </>
                )}
                {dominant === "negative" && (
                  <>
                    <SmileySad className="size-5 text-destructive shrink-0" weight="fill" />
                    <span className="text-caption text-destructive font-medium truncate">Mostly Negative</span>
                  </>
                )}
                {dominant === "neutral" && (
                  <>
                    <SmileyMeh className="size-5 text-muted-foreground shrink-0" weight="fill" />
                    <span className="text-caption text-muted-foreground font-medium truncate">Mostly Neutral</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
