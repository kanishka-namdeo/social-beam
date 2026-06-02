"use client";

import { Fire, Trophy, Target, Clock } from "@phosphor-icons/react/ssr";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PostingStreakWidgetProps {
  streak: {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
    lastPostDate: string | null;
  };
}

function getConsistencyColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function getProgressIndicatorColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--destructive)";
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Never";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Never";
  }
}

export function PostingStreakWidget({ streak }: PostingStreakWidgetProps) {
  const { currentStreak, longestStreak, consistencyScore, lastPostDate } = streak;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <Fire className="size-4 text-brand" weight="bold" />
          Posting Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Fire weight="duotone" className="size-5" />
              <span className="text-sm">Current Streak</span>
            </div>
            {currentStreak === 0 ? (
              <p className="text-sm text-muted-foreground">No active streak</p>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl tabular-nums text-foreground">
                  {currentStreak}
                </span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy weight="duotone" className="size-5" />
              <span className="text-sm">Longest Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl tabular-nums text-foreground">
                {longestStreak}
              </span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target weight="duotone" className="size-5" />
              <span className="text-sm">Consistency</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={consistencyScore}
                className="h-2"
                indicatorColor={getProgressIndicatorColor(consistencyScore)}
              />
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  getConsistencyColor(consistencyScore)
                )}
              >
                {consistencyScore}%
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock weight="duotone" className="size-5" />
              <span className="text-sm">Last Posted</span>
            </div>
            <span className="font-mono text-sm tabular-nums text-foreground">
              {formatRelativeTime(lastPostDate)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
