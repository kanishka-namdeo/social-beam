"use client";

import { useMemo, useState } from "react";
import { Sparkle, CalendarDots, ArrowRight, Clock, Lightbulb } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, eachDayOfInterval, isSameDay, isSameWeek } from "date-fns";
import { cn } from "@/lib/utils";
import {
  parseWeeklyCadence,
  getTotalWeeklyTarget,
  getPlatformBreakdown,
} from "@/lib/utils/cadence";
import { toast } from "sonner";
import type { PostItem } from "./types";

interface ContentGapAnalysisProps {
  posts: PostItem[];
  onComposeForSlot: (date: Date) => void;
  platformContexts?: Array<{ platform: string; postingCadence: string | null }>;
  onAiFill?: (dates: Date[]) => void;
}

// Fallback when no cadence data is available
const FALLBACK_POSTS_PER_WEEK = 5;
const FALLBACK_PER_DAY: Record<number, number> = {
  0: 0, // Sunday
  1: 1, // Monday
  2: 1, // Tuesday
  3: 1, // Wednesday
  4: 1, // Thursday
  5: 1, // Friday
  6: 0, // Saturday
};

function getDailyTarget(dayOfWeek: number, weeklyTarget: number): number {
  if (weeklyTarget <= 0) return 0;
  // Distribute across weekdays (Mon-Fri)
  const weekdays = 5;
  const perWeekday = weeklyTarget / weekdays;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekends get a reduced share (20% of weekday)
    return Math.round(perWeekday * 0.2 * 10) / 10;
  }
  return Math.round(perWeekday * 10) / 10;
}

export function ContentGapAnalysis({
  posts,
  onComposeForSlot,
  platformContexts,
  onAiFill,
}: ContentGapAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);

  const handleAiFill = async () => {
    if (!onAiFill || gapDays.length === 0) return;
    
    setAiFilling(true);
    try {
      const dates = gapDays.map((day) => day.date);
      await onAiFill(dates);
      toast.success(`AI filled ${dates.length} empty slots with content ideas`);
    } catch (error) {
      console.error("AI fill failed:", error);
      toast.error("Failed to generate AI ideas");
    } finally {
      setAiFilling(false);
    }
  };

  const weeklyTarget = useMemo(() => {
    const total = getTotalWeeklyTarget(platformContexts);
    return total > 0 ? total : FALLBACK_POSTS_PER_WEEK;
  }, [platformContexts]);

  const hasCadenceData = useMemo(() => {
    return (
      platformContexts !== undefined &&
      platformContexts.length > 0 &&
      platformContexts.some((ctx) => parseWeeklyCadence(ctx.postingCadence) !== null)
    );
  }, [platformContexts]);

  const platformBreakdown = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const weekPosts = posts.filter(
      (p) =>
        (p.status === "SCHEDULED" || p.status === "DRAFT") &&
        p.scheduledAt &&
        isSameWeek(new Date(p.scheduledAt), today, { weekStartsOn: 1 })
    );

    return getPlatformBreakdown(platformContexts, weekPosts).filter(
      (p) => p.target > 0
    );
  }, [posts, platformContexts]);

  const weekAnalysis = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    });

    const scheduled = posts.filter((p) => p.status === "SCHEDULED" || p.status === "DRAFT");

    return weekDays.map((day) => {
      const dayPosts = scheduled.filter(
        (p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day)
      );
      const target = hasCadenceData
        ? getDailyTarget(day.getDay(), weeklyTarget)
        : FALLBACK_PER_DAY[day.getDay()] ?? 1;
      const deficit = Math.max(0, target - dayPosts.length);

      return {
        date: day,
        postCount: dayPosts.length,
        target,
        deficit,
        isToday: isSameDay(day, today),
      };
    });
  }, [posts, weeklyTarget, hasCadenceData]);

  const totalScheduled = weekAnalysis.reduce((sum, d) => sum + d.postCount, 0);
  const totalTarget = weekAnalysis.reduce((sum, d) => sum + d.target, 0);
  const totalDeficit = weekAnalysis.reduce((sum, d) => sum + d.deficit, 0);
  const gapDays = weekAnalysis.filter((d) => d.deficit > 0);

  if (totalScheduled === 0 && totalDeficit === 0) {
    return null;
  }

  const displayTarget = Math.round(totalTarget) || weeklyTarget;

  return (
    <Card className="rounded-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            <CardTitle className="text-sm font-medium tracking-tight">Weekly Content Analysis</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "normal-case gap-1",
              totalScheduled >= displayTarget
                ? "text-success border-success"
                : "text-warning border-warning"
            )}
          >
            <Clock className="size-3" />
            {totalScheduled}/{displayTarget} this week
          </Badge>
        </div>
        <CardDescription>
          {totalDeficit > 0
            ? `${
                hasCadenceData
                  ? "Based on your brand cadence settings"
                  : "AI recommends"
              } — ${totalDeficit} more post${totalDeficit > 1 ? "s" : ""} to maintain consistent presence`
            : "Your posting schedule looks great this week!"}
        </CardDescription>
      </CardHeader>

      {/* Per-platform breakdown */}
      {hasCadenceData && platformBreakdown.length > 0 && (
        <CardContent className="pt-0 pb-2">
          <div className="space-y-1.5">
            {platformBreakdown.map((p) => {
              const onTrack = p.scheduled >= p.target;
              return (
                <div key={p.platform} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        onTrack ? "bg-success" : "bg-warning"
                      )}
                    />
                    <span className="text-foreground capitalize">{p.platform}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {p.scheduled}/{p.target} posts
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}

      {totalDeficit > 0 && (
        <CardContent className="pt-0 space-y-3">
          <div className="space-y-2">
            {(expanded ? gapDays : gapDays.slice(0, 3)).map((day) => (
              <div
                key={day.date.toISOString()}
                className="flex items-center justify-between rounded-sm border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <CalendarDots className="size-4 text-brand" weight="bold" />
                  <span className="text-sm font-medium text-foreground">
                    {format(day.date, "EEEE, MMM d")}
                    {day.isToday && (
                      <Badge variant="secondary" className="ml-2 text-micro normal-case">
                        Today
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {day.postCount} / {day.target} scheduled
                  </span>
                  {onAiFill && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                      onClick={() => onAiFill([day.date])}
                      disabled={aiFilling}
                    >
                      {aiFilling ? (
                        <>
                          <Sparkle className="size-3 animate-spin" />
                          Filling...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="size-3" />
                          AI Fill
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-brand hover:bg-brand/10 hover:text-brand"
                    onClick={() => onComposeForSlot(day.date)}
                  >
                    Fill gap
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {gapDays.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : `+${gapDays.length - 3} more gaps`}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
