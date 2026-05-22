"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendUp, TrendDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AudienceGrowthProps {
  timeSeries: Record<string, { date: string; followers: number }[]>;
  netChangeByPlatform: Record<string, { start: number; end: number; netChange: number }>;
  totalNetChange: number;
}

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

export function AudienceGrowthChart({ timeSeries, netChangeByPlatform, totalNetChange }: AudienceGrowthProps) {
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    for (const [platform, entries] of Object.entries(timeSeries)) {
      for (const entry of entries) {
        if (!dateMap.has(entry.date)) {
          dateMap.set(entry.date, {});
        }
        const dateEntry = dateMap.get(entry.date)!;
        dateEntry[platform] = entry.followers;
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, followers]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...followers,
      }));
  }, [timeSeries]);

  const platforms = Object.keys(timeSeries);

  if (platforms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience Growth</CardTitle>
          <CardDescription>Track follower count across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              Connect accounts to track audience growth.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audience Growth</CardTitle>
        <CardDescription>Follower count trends across platforms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net change summary */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <span className="text-xs text-muted-foreground">Total Net Change:</span>
            <span className={cn(
              "text-sm font-semibold",
              totalNetChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {totalNetChange >= 0 ? "+" : ""}{totalNetChange.toLocaleString()}
            </span>
            {totalNetChange >= 0 ? (
              <TrendUp className="size-4 text-success" weight="bold" />
            ) : (
              <TrendDown className="size-4 text-destructive" weight="bold" />
            )}
          </div>
          {platforms.map((platform) => {
            const change = netChangeByPlatform[platform];
            if (!change) return null;
            return (
              <Badge key={platform} variant="outline" className="gap-1">
                <span className="capitalize">{platform}</span>
                <span className={cn(
                  "font-medium",
                  change.netChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {change.netChange >= 0 ? "+" : ""}{change.netChange.toLocaleString()}
                </span>
              </Badge>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" stroke="var(--muted-foreground)" />
            <YAxis className="text-xs" stroke="var(--muted-foreground)" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
                    <p className="text-sm font-medium text-foreground mb-1">{payload[0].payload.date}</p>
                    {payload.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground capitalize">{entry.name}:</span>
                        <span className="font-medium text-foreground">
                          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {platforms.map((platform, idx) => (
              <Line
                key={platform}
                type="monotone"
                dataKey={platform}
                stroke={chartColors[idx % chartColors.length]}
                strokeWidth={2}
                dot={false}
                name={platform}
              />
            ))}
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
