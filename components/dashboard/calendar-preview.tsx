"use client";

import Link from "next/link";
import { CalendarDots, ArrowRight } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface ScheduledPost {
  id: string;
  title: string | null;
  platforms: string[];
  scheduledAt: string;
}

interface DaySlot {
  date: Date;
  dayName: string;
  dayNum: number;
  posts: ScheduledPost[];
}

interface CalendarPreviewProps {
  posts: ScheduledPost[];
  size?: WidgetSizeToken;
}

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
};

export function CalendarPreview({ posts, size = "5x3" }: CalendarPreviewProps) {
  const { isCompact, isWide } = getSizeDerivatives(size);
  const daysToShow = isCompact ? 4 : 7;

  const days: DaySlot[] = [];
  const today = new Date();

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayPosts = posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const scheduledDate = new Date(p.scheduledAt);
      return scheduledDate.toDateString() === date.toDateString();
    });

    days.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      posts: dayPosts,
    });
  }

  return (
    <BaseWidget
      size={size}
      isEmpty={posts.length === 0}
      emptyState={{
        icon: <CalendarDots className="size-8" weight="light" />,
        message: "No scheduled posts yet",
        description: "Schedule content to see it here.",
        cta: {
          label: "Create Post",
          href: "/dashboard/compose",
        },
      }}
      header={{
        title: `Next ${daysToShow} Days`,
        icon: <CalendarDots className="size-4" weight="bold" />,
        description: !isCompact ? "Your upcoming scheduled posts" : undefined,
      }}
    >
          <div className="space-y-section">
            {/* Desktop grid layout - shown when widget is wide enough */}
            <div className={cn(
              "gap-control",
              isWide || (!isCompact && !isWide) ? "grid" : "hidden",
              daysToShow === 4 ? "grid-cols-4" : "grid-cols-7"
            )}>
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex flex-col items-center rounded-sm border p-2 min-h-0 overflow-hidden transition-colors",
                    day.posts.length > 0
                      ? "border-border bg-card"
                      : "border-dashed border-border/50 bg-muted/20"
                  )}
                >
                  <span className="text-caption font-medium uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                    {day.dayName}
                  </span>
                  <span className="text-heading font-semibold text-foreground">{day.dayNum}</span>
                  <div className="mt-1 flex flex-col gap-tight w-full min-w-0">
                    {day.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/dashboard/compose?postId=${post.id}`}
                        className="group min-w-0"
                      >
                        <div className="rounded-sm px-1.5 py-0.5 text-micro font-medium truncate bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                          {post.title ?? "Untitled"}
                        </div>
                        <div className="flex gap-tight mt-0.5">
                          {post.platforms.map((p) => (
                            <span
                              key={p}
                              className={cn(
                                "size-2 rounded-sm",
                                platformColors[p] ?? "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/list layout - shown when widget is narrow or compact */}
            <div className={cn(
              "flex flex-col gap-control",
              isWide ? "hidden" : "flex"
            )}>
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex items-center gap-section rounded-sm border px-3 py-2 transition-colors min-w-0",
                    day.posts.length > 0
                      ? "border-border bg-card"
                      : "border-dashed border-border/50 bg-muted/20"
                  )}
                >
                  <div className={cn("flex flex-col items-center shrink-0", isCompact ? "min-w-[28px]" : "min-w-[36px]")}>
                    <span className="text-micro font-medium uppercase text-muted-foreground">
                      {day.dayName}
                    </span>
                    <span className="text-body font-semibold text-foreground">{day.dayNum}</span>
                  </div>
                  {day.posts.length > 0 ? (
                    <div className="flex flex-col gap-tight flex-1 min-w-0">
                      {day.posts.map((post) => (
                        <Link
                          key={post.id}
                          href={`/dashboard/compose?postId=${post.id}`}
                          className="group min-w-0"
                        >
                          <div className="rounded-sm px-1.5 py-0.5 text-caption font-medium truncate bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                            {post.title ?? "Untitled"}
                          </div>
                          <div className="flex gap-tight mt-0.5">
                            {post.platforms.map((p) => (
                              <span
                                key={p}
                                className={cn(
                                  "size-2 rounded-sm",
                                  platformColors[p] ?? "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-caption text-muted-foreground flex-1">No posts</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-panel flex justify-end">
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-tight text-caption text-muted-foreground hover:text-foreground transition-colors"
              >
                View full calendar
                <ArrowRight className="size-3" weight="bold" />
              </Link>
            </div>
          </div>
    </BaseWidget>
  );
}
