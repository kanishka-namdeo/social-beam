"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarIcon,
  TrendingUpIcon,
  UsersIcon,
  BarChart3Icon,
} from "lucide-react";

interface PostFrequencyData {
  date: string;
  count: number;
}

interface Props {
  data: PostFrequencyData[];
  avgPostsPerDay: number;
  currentStreak: number;
  engagementPerFollower: number;
}

export function PostFrequencyChart({ data, avgPostsPerDay, currentStreak, engagementPerFollower }: Props) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    posts: d.count,
  }));

  const activeDays = data.filter((d) => d.count > 0).length;
  const totalPosts = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Posting Consistency & Efficiency</CardTitle>
        <p className="text-sm text-muted-foreground">
          How consistently you post and how well your audience engages
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-sm border p-3">
            <div className="flex items-center gap-2 text-sm font-medium tracking-tight text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              Posting Streak
            </div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">
              {currentStreak}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
            {currentStreak >= 7 && (
              <Badge variant="default" className="mt-1 rounded-sm text-xs">
                <TrendingUpIcon className="mr-1 h-3 w-3" /> On fire!
              </Badge>
            )}
          </div>
          <div className="rounded-sm border p-3">
            <div className="flex items-center gap-2 text-sm font-medium tracking-tight text-muted-foreground">
              <BarChart3Icon className="h-4 w-4" />
              Avg Posts / Day
            </div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">
              {avgPostsPerDay.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {activeDays} active days · {totalPosts} total
            </div>
          </div>
          <div className="rounded-sm border p-3">
            <div className="flex items-center gap-2 text-sm font-medium tracking-tight text-muted-foreground">
              <UsersIcon className="h-4 w-4" />
              Engagement / Follower
            </div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">
              {engagementPerFollower.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Engagements per follower
            </div>
          </div>
          <div className="rounded-sm border p-3">
            <div className="text-sm font-medium tracking-tight text-muted-foreground">Active Day Rate</div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums">
              {data.length > 0 ? ((activeDays / data.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              of days with posts
            </div>
          </div>
        </div>

        <Separator />

        {/* Frequency chart */}
        <ResponsiveContainer width="100%" height={192}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="posts" fill="var(--brand)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
