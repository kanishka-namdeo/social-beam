"use client";

import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PostChip } from "./post-chip";
import type { PostItem } from "./types";

interface WeekViewProps {
  currentDate: Date;
  posts: PostItem[];
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onDuplicate?: (postId: string) => Promise<void>;
}

const HOUR_START = 6; // 6 AM
const HOUR_END = 22; // 10 PM
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekView({ currentDate, posts, onPreview, onDelete, onDuplicate }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  const today = new Date();

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-8 border-b border-border bg-muted/30">
        <div className="p-2 border-r border-border w-16" />
        {weekDays.map((day) => {
          const isToday =
            day.toDateString() === today.toDateString();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center border-r border-border last:border-r-0",
                isToday && "bg-brand/10",
              )}
            >
              <div className="text-[0.625rem] font-semibold uppercase text-muted-foreground">
                {DAY_NAMES[day.getDay()]}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  isToday
                    ? "flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground mt-1 mx-auto"
                    : "text-foreground mt-1",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8 divide-x divide-border">
        {/* Time labels column */}
        <div className="w-16 divide-y divide-border">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 flex items-start justify-end pr-2 text-[0.625rem] text-muted-foreground tabular-nums"
            >
              {format(new Date().setHours(hour, 0), "h a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const dayPosts = posts.filter((p) => {
            if (!p.scheduledAt) return false;
            const postDate = new Date(p.scheduledAt);
            return postDate.toDateString() === day.toDateString();
          });

          return (
            <div key={day.toISOString()} className="relative">
              {/* Hour slots */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-12 border-b border-border/30"
                />
              ))}

              {/* Post chips positioned by time */}
              {dayPosts.map((post) => {
                if (!post.scheduledAt) return null;
                const postDate = new Date(post.scheduledAt);
                const hour = postDate.getHours();
                const minute = postDate.getMinutes();
                const top = ((hour - HOUR_START) * 60 + minute) * (48 / 60); // 48px per hour

                return (
                  <div
                    key={post.id}
                    className="absolute left-0.5 right-0.5 z-10"
                    style={{ top: `${top}px` }}
                  >
                    <PostChip
                      id={post.id}
                      title={post.title}
                      status={post.status}
                      confidence={post.confidence}
                      scheduledAt={post.scheduledAt}
                      platforms={post.platforms}
                      compact
                      hasMedia={post.media != null && post.media.length > 0}
                      onPreview={onPreview}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
