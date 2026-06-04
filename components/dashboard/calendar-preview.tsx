"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDots, ArrowRight } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

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
}

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
};

export function CalendarPreview({ posts }: CalendarPreviewProps) {
  const days: DaySlot[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayPosts = posts.filter((p) => {
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
    <Card className="h-full rounded-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <CalendarDots className="size-4 text-brand" weight="bold" />
          Next 7 Days
        </CardTitle>
        <CardDescription>Your upcoming scheduled posts</CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              No scheduled posts yet. Schedule content to see it here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-7 gap-2">
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex flex-col items-center rounded-sm border p-2 min-h-[80px] transition-colors",
                    day.posts.length > 0
                      ? "border-border bg-card"
                      : "border-dashed border-border/50 bg-muted/20"
                  )}
                >
                  <span className="text-micro font-medium uppercase text-muted-foreground">
                    {day.dayName}
                  </span>
                  <span className="text-lg font-semibold text-foreground">{day.dayNum}</span>
                  <div className="mt-1 flex flex-col gap-1 w-full">
                    {day.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/dashboard/compose?postId=${post.id}`}
                        className="group"
                      >
                        <div className="rounded-sm px-1.5 py-0.5 text-micro font-medium truncate bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                          {post.title ?? "Untitled"}
                        </div>
                        <div className="flex gap-0.5 mt-0.5">
                          {post.platforms.map((p) => (
                            <span
                              key={p}
                              className={cn(
                                "size-1.5 rounded-sm",
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

            <div className="md:hidden flex flex-col gap-2">
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex items-center gap-3 rounded-sm border px-3 py-2 transition-colors",
                    day.posts.length > 0
                      ? "border-border bg-card"
                      : "border-dashed border-border/50 bg-muted/20"
                  )}
                >
                  <div className="flex flex-col items-center min-w-[36px]">
                    <span className="text-micro font-medium uppercase text-muted-foreground">
                      {day.dayName}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{day.dayNum}</span>
                  </div>
                  {day.posts.length > 0 ? (
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {day.posts.map((post) => (
                        <Link
                          key={post.id}
                          href={`/dashboard/compose?postId=${post.id}`}
                          className="group"
                        >
                          <div className="rounded-sm px-1.5 py-0.5 text-xs font-medium truncate bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                            {post.title ?? "Untitled"}
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {post.platforms.map((p) => (
                              <span
                                key={p}
                                className={cn(
                                  "size-1.5 rounded-sm",
                                  platformColors[p] ?? "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-1">No posts</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View full calendar
                <ArrowRight className="size-3" weight="bold" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
