"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

interface ConfidenceData {
  level: string;
  count: number;
  avgEngagementRate: number;
  totalEngagements: number;
  totalImpressions: number;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "var(--success)",
  MEDIUM: "var(--warning)",
  LOW: "var(--destructive)",
  UNKNOWN: "var(--muted-foreground)",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  UNKNOWN: "No Prediction",
};

export function ConfidenceCorrelationChart({ data }: { data: ConfidenceData[] }) {
  const { config } = useInvisibleAI();
  const chartData = data.map((d) => ({
    name: CONFIDENCE_LABELS[d.level] ?? d.level,
    "Avg Engagement Rate": d.avgEngagementRate,
    "Post Count": d.count,
    color: CONFIDENCE_COLORS[d.level] ?? "var(--muted-foreground)",
  }));

  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  return (
    <Card className="rounded-sm bg-ai-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="text-foreground">Confidence vs Actual Performance</span>
          {config.showAIInsightsBadge && (
            <Badge variant="outline" className="rounded-sm text-xs">AI Insight</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Does higher confidence correlate with better post performance?
        </p>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      fontSize: "12px",
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      if (name === "Avg Engagement Rate") {
                        const numValue = typeof value === "number" ? value : 0;
                        return [`${(numValue * 100).toFixed(2)}%`, "Avg Engagement Rate"];
                      }
                      return [String(value), String(name)];
                    }}
                  />
                  <Bar
                    dataKey="Avg Engagement Rate"
                    fill="var(--brand)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            <div className="mt-4 grid-auto-fill gap-3">
              {data.map((d) => (
                <div key={d.level} className="rounded-sm border p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: CONFIDENCE_COLORS[d.level] }}
                    />
                    <span className="text-sm font-medium">{CONFIDENCE_LABELS[d.level]}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {d.count} posts · {(d.avgEngagementRate * 100).toFixed(1)}% avg engagement
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No confidence data yet — published posts will populate this chart.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
