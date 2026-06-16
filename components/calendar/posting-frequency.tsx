"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartBar, CalendarDots, TrendUp, TrendDown, CheckCircle, Warning } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { parseWeeklyCadence } from "@/lib/utils/cadence";
import { startOfWeek, endOfWeek, startOfMonth, isSameWeek, isSameMonth, eachDayOfInterval } from "date-fns";
import type { PostItem } from "./types";

interface PlatformContext {
  platform: string;
  postingCadence: string | null;
}

interface PostingFrequencyProps {
  posts: PostItem[];
  platformContexts?: PlatformContext[];
}

export function PostingFrequency({ posts, platformContexts }: PostingFrequencyProps) {
  const stats = useMemo(() => {
    const today = new Date();
    const scheduled = posts.filter((p) => p.status === "SCHEDULED");
    const published = posts.filter((p) => p.status === "PUBLISHED");

    // Current week stats
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekPosts = scheduled.filter((p) => p.scheduledAt && isSameWeek(new Date(p.scheduledAt), today, { weekStartsOn: 1 }));

    // Current month stats
    const monthStart = startOfMonth(today);
    const monthPosts = scheduled.filter((p) => p.scheduledAt && isSameMonth(new Date(p.scheduledAt), monthStart));

    // Published this week
    const weekPublished = published.filter((p) => p.publishedAt && isSameWeek(new Date(p.publishedAt), today, { weekStartsOn: 1 }));

    // Daily distribution for current week
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyCounts = weekDays.map((day) => {
      const count = scheduled.filter((p) => p.scheduledAt && new Date(p.scheduledAt).toDateString() === day.toDateString()).length;
      return { name: dayNames[day.getDay()], count, isToday: day.toDateString() === today.toDateString() };
    });

    // Platform distribution
    const platformCounts = new Map<string, number>();
    for (const post of scheduled) {
      for (const pl of post.platforms) {
        platformCounts.set(pl.platform, (platformCounts.get(pl.platform) ?? 0) + 1);
      }
    }

    // Previous week comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
    const prevWeekCount = posts.filter((p) => p.scheduledAt && p.status === "SCHEDULED" && isSameWeek(new Date(p.scheduledAt), prevWeekStart, { weekStartsOn: 1 })).length;

    const weekDelta = weekPosts.length - prevWeekCount;

    return {
      weekCount: weekPosts.length,
      monthCount: monthPosts.length,
      weekPublished: weekPublished.length,
      dailyCounts,
      platformCounts,
      weekDelta,
    };
  }, [posts]);

  const maxDaily = Math.max(...stats.dailyCounts.map((d) => d.count), 1);

  return (
    <Card className="rounded-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBar className="size-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium tracking-tight">Posting Frequency</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "normal-case gap-1",
              stats.weekDelta > 0 ? "text-success border-success" : stats.weekDelta < 0 ? "text-destructive border-destructive" : "text-muted-foreground"
            )}
          >
            {stats.weekDelta > 0 ? <TrendUp className="size-3" /> : stats.weekDelta < 0 ? <TrendDown className="size-3" /> : <CalendarDots className="size-3" />}
            {stats.weekDelta > 0 ? `+${stats.weekDelta}` : stats.weekDelta} vs last week
          </Badge>
        </div>
        <CardDescription>
          {stats.weekCount} scheduled this week, {stats.monthCount} this month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily distribution */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</span>
          <div className="flex items-end gap-1 h-16">
            {stats.dailyCounts.map((d) => (
              <div key={d.name} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "w-full rounded-sm transition-colors",
                    d.isToday
                      ? "bg-brand"
                      : d.count > 0
                      ? "bg-brand/40"
                      : "bg-muted"
                  )}
                  style={{ height: `${Math.max((d.count / maxDaily) * 100, 8)}%` }}
                />
                <span className={cn("text-micro tabular-nums", d.isToday && "font-semibold text-brand")}>
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform distribution */}
        {stats.platformCounts.size > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By Platform</span>
            {Array.from(stats.platformCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => (
                <div key={platform} className="flex items-center gap-2">
                  <span className="text-xs text-foreground capitalize w-20">{platform}</span>
                  <Progress value={Math.min((count / (stats.weekCount || 1)) * 100, 100)} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        )}

        {/* Published this week */}
        {stats.weekPublished > 0 && (
          <div className="flex items-center gap-2 text-xs text-success">
            <TrendUp className="size-3.5" weight="fill" />
            <span>{stats.weekPublished} published this week</span>
          </div>
        )}

        {/* Brand Cadence Alignment */}
        {platformContexts && platformContexts.length > 0 && (
          <BrandCadenceAlignment
            platformContexts={platformContexts}
            platformCounts={stats.platformCounts}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BrandCadenceAlignment({
  platformContexts,
  platformCounts,
}: {
  platformContexts: PlatformContext[];
  platformCounts: Map<string, number>;
}) {
  const alignmentItems = platformContexts
    .map((ctx) => {
      const target = parseWeeklyCadence(ctx.postingCadence);
      if (target === null || target === 0) return null;
      const actual = platformCounts.get(ctx.platform) ?? 0;
      const delta = actual - target;
      const progress = Math.min((actual / target) * 100, 100);
      return { platform: ctx.platform, actual, target, delta, progress };
    })
    .filter(Boolean) as Array<{ platform: string; actual: number; target: number; delta: number; progress: number }>;

  if (alignmentItems.length === 0) return null;

  const onTrack = alignmentItems.filter((a) => a.delta >= 0).length;

  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brand Cadence Alignment</span>
      {alignmentItems.map((item) => {
        const colorClass =
          item.delta >= 0
            ? "border-success text-success"
            : item.delta === -1
              ? "border-warning text-warning"
              : "border-destructive text-destructive";
        const progressColor =
          item.delta >= 0 ? "bg-success" : item.delta === -1 ? "bg-warning" : "bg-destructive";

        return (
          <div key={item.platform} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {item.delta >= 0 ? (
                  <CheckCircle className="size-3.5 text-success" weight="fill" />
                ) : (
                  <Warning className="size-3.5 text-warning" weight="fill" />
                )}
                <span className="text-xs text-foreground capitalize">{item.platform}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={`text-xs ${colorClass} normal-case`}>
                  {item.delta >= 0 ? `+${item.delta}` : item.delta}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.actual}/{item.target} scheduled
                </span>
              </div>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width]", progressColor)}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">Overall alignment</span>
        <Badge variant="outline" className={cn(
          "text-xs normal-case",
          onTrack === alignmentItems.length
            ? "text-success border-success"
            : "text-warning border-warning"
        )}>
          {onTrack}/{alignmentItems.length} platforms on track
        </Badge>
      </div>
    </div>
  );
}
