"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TimeSeriesData {
  date: string;
  overall: {
    impressions: number;
    engagements: number;
    reach: number;
    clicks: number;
    engagementRate: number;
  };
  byPlatform: Record<string, {
    impressions: number;
    engagements: number;
    reach: number;
    clicks: number;
    engagementRate: number;
  }>;
}

interface AnalyticsOverviewProps {
  timeSeries: TimeSeriesData[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function CustomTooltipContent({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function AnalyticsOverview({ timeSeries }: AnalyticsOverviewProps) {
  const chartData = useMemo(() => {
    return timeSeries.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      impressions: d.overall.impressions,
      engagements: d.overall.engagements,
      reach: d.overall.reach,
      clicks: d.overall.clicks,
      engagementRate: d.overall.engagementRate,
    }));
  }, [timeSeries]);

  const platformChartData = useMemo(() => {
    return timeSeries.map((d) => {
      const base: Record<string, string | number> = {
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      for (const [platform, metrics] of Object.entries(d.byPlatform)) {
        base[`${platform}_engagements`] = metrics.engagements;
      }
      return base;
    });
  }, [timeSeries]);

  const platforms = useMemo(() => {
    if (timeSeries.length === 0) return [];
    return Object.keys(timeSeries[0].byPlatform);
  }, [timeSeries]);

  if (timeSeries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Overview</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              Publish posts to see performance trends.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance Overview</CardTitle>
        <CardDescription>Impressions and engagement trends over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="engagement">
          <TabsList className="mb-4">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="impressions">Impressions</TabsTrigger>
            <TabsTrigger value="platforms">By Platform</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="engagements"
                  stackId="1"
                  stroke={chartColors[0]}
                  fill={chartColors[0]}
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stackId="1"
                  stroke={chartColors[1]}
                  fill={chartColors[1]}
                  fillOpacity={0.3}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="impressions">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke={chartColors[2]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="platforms">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={platformChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
                />
                <Tooltip content={<CustomTooltipContent />} />
                {platforms.map((platform, idx) => (
                  <Line
                    key={platform}
                    type="monotone"
                    dataKey={`${platform}_engagements`}
                    stroke={chartColors[idx % chartColors.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
