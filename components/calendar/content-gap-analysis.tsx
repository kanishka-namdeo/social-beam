"use client";

import { useMemo, useState } from "react";
import { Sparkle, CalendarDots, ArrowRight, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { PostItem } from "./types";

interface ContentGapAnalysisProps {
  posts: PostItem[];
  onComposeForSlot: (date: Date) => void;
}

const OPTIMAL_POSTS_PER_WEEK = 5;
const OPTIMAL_PER_DAY: Record<number, number> = {
  0: 0, // Sunday - minimal
  1: 1, // Monday
  2: 1, // Tuesday
  3: 1, // Wednesday
  4: 1, // Thursday
  5: 1, // Friday
  6: 0, // Saturday - minimal
};

export function ContentGapAnalysis({
  posts,
  onComposeForSlot,
}: ContentGapAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  const weekAnalysis = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekDays = eachDayOfInterval({ start: weekStart, end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) });

    const scheduled = posts.filter((p) => p.status === "SCHEDULED" || p.status === "DRAFT");

    return weekDays.map((day) => {
      const dayPosts = scheduled.filter((p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));
      const target = OPTIMAL_PER_DAY[day.getDay()] ?? 1;
      const deficit = Math.max(0, target - dayPosts.length);

      return {
        date: day,
        postCount: dayPosts.length,
        target,
        deficit,
        isToday: isSameDay(day, today),
      };
    });
  }, [posts]);

  const totalScheduled = weekAnalysis.reduce((sum, d) => sum + d.postCount, 0);
  const totalDeficit = weekAnalysis.reduce((sum, d) => sum + d.deficit, 0);
  const gapDays = weekAnalysis.filter((d) => d.deficit > 0);

  if (totalScheduled === 0 && totalDeficit === 0) {
    return null;
  }

  return (
    <Card className="border-ai-surface/50 bg-ai-surface/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            <CardTitle className="text-sm">Weekly Content Analysis</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "normal-case gap-1",
              totalScheduled >= OPTIMAL_POSTS_PER_WEEK
                ? "text-success border-success"
                : "text-warning border-warning"
            )}
          >
            <Clock className="size-3" />
            {totalScheduled}/{OPTIMAL_POSTS_PER_WEEK} this week
          </Badge>
        </div>
        <CardDescription>
          {totalDeficit > 0
            ? `AI recommends ${totalDeficit} more post${totalDeficit > 1 ? "s" : ""} to maintain consistent presence`
            : "Your posting schedule looks great this week!"}
        </CardDescription>
      </CardHeader>

      {totalDeficit > 0 && (
        <CardContent className="pt-0 space-y-3">
          {/* Gap days */}
          <div className="space-y-2">
            {(expanded ? gapDays : gapDays.slice(0, 3)).map((day) => (
              <div
                key={day.date.toISOString()}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <CalendarDots className="size-4 text-brand" weight="bold" />
                  <span className="text-sm text-foreground">
                    {format(day.date, "EEEE, MMM d")}
                    {day.isToday && (
                      <Badge variant="secondary" className="ml-2 text-[0.6rem] normal-case">
                        Today
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {day.postCount} / {day.target} scheduled
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-brand hover:bg-brand/10"
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
