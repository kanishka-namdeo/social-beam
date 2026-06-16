"use client";

import { Fire, Trophy, Target, Clock } from "@phosphor-icons/react/ssr";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface PostingStreakWidgetProps {
  streak: {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
    lastPostDate: string | null;
  };
  isLoading?: boolean;
  size?: WidgetSizeToken;
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

export function PostingStreakWidget({ streak, isLoading, size = "5x2" }: PostingStreakWidgetProps) {
  const { currentStreak, longestStreak, consistencyScore, lastPostDate } = streak;
  const { isNarrow, isCompact } = getSizeDerivatives(size);

  const isEmpty = currentStreak === 0 && longestStreak === 0;

  return (
    <BaseWidget
      size={size}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyState={{
        icon: <Fire className="size-8" weight="light" />,
        message: "No posting streak yet",
        description: "Start publishing to track your streak",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: "Posting Streak",
        icon: <Fire className="size-4 text-brand" weight="bold" />,
        showTitle: !isCompact,
      }}
    >
      <div className={cn(
        "grid gap-section sm:gap-panel",
        isNarrow ? "grid-cols-1" : "grid-cols-2"
      )}>
        <div className="flex flex-col gap-tight">
          <div className="flex items-center gap-control text-muted-foreground">
            <Fire weight="duotone" className={isCompact ? "size-4" : "size-5"} />
            <span className="text-body">Current</span>
          </div>
          {currentStreak === 0 ? (
            <p className="text-body text-muted-foreground">No streak</p>
          ) : (
            <div className="flex items-baseline gap-tight">
              <span className={cn(
                "font-mono tabular-nums text-foreground",
                isCompact ? "text-title" : "text-heading"
              )}>
                {currentStreak}
              </span>
              <span className="text-body text-muted-foreground">days</span>
            </div>
          )}
        </div>

        {!isCompact && (
          <div className="flex flex-col gap-tight">
            <div className="flex items-center gap-control text-muted-foreground">
              <Trophy weight="duotone" className="size-5" />
              <span className="text-body">Longest</span>
            </div>
            <div className="flex items-baseline gap-tight">
              <span className="font-mono text-heading tabular-nums text-foreground">
                {longestStreak}
              </span>
              <span className="text-body text-muted-foreground">days</span>
            </div>
          </div>
        )}

        {!isNarrow && (
          <div className="flex flex-col gap-control">
            <div className="flex items-center gap-control text-muted-foreground">
              <Target weight="duotone" className="size-5" />
              <span className="text-body">Consistency</span>
            </div>
            <div className="flex items-center gap-control min-w-0">
              <Progress
                value={consistencyScore}
                className="h-2 flex-1 min-w-0"
                indicatorColor={getProgressIndicatorColor(consistencyScore)}
              />
              <span
                className={cn(
                  "font-mono text-body tabular-nums shrink-0",
                  getConsistencyColor(consistencyScore)
                )}
              >
                {consistencyScore}%
              </span>
            </div>
          </div>
        )}

        {!isCompact && (
          <div className="flex flex-col gap-tight">
            <div className="flex items-center gap-control text-muted-foreground">
              <Clock weight="duotone" className="size-5" />
              <span className="text-body">Last Posted</span>
            </div>
            <span className="font-mono text-body tabular-nums text-foreground truncate">
              {formatRelativeTime(lastPostDate)}
            </span>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
