"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PostChip } from "./post-chip";
import type { PostItem } from "./types";

interface DayViewProps {
  currentDate: Date;
  posts: PostItem[];
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (postId: string) => Promise<void>;
}

const HOUR_START = 6;
const HOUR_END = 22;

export function DayView({ currentDate, posts, onPreview, onDelete, onDuplicate }: DayViewProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  const dayPosts = posts.filter((p) => {
    if (!p.scheduledAt) return false;
    return new Date(p.scheduledAt).toDateString() === currentDate.toDateString();
  });

  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="text-lg font-medium tracking-tight text-foreground">
          {format(currentDate, "EEEE, MMMM d, yyyy")}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""} scheduled
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {hours.map((hour) => {
          const hourPosts = dayPosts.filter((p) => {
            if (!p.scheduledAt) return false;
            return new Date(p.scheduledAt).getHours() === hour;
          });

          return (
            <div
              key={hour}
              className={cn(
                "flex border-b border-border/30 min-h-[60px]",
                isToday && hour === now.getHours() && "bg-brand/5",
              )}
            >
              {/* Time label */}
              <div className="w-20 shrink-0 px-3 py-2 text-xs text-muted-foreground tabular-nums border-r border-border/30">
                {format(new Date().setHours(hour, 0), "h a")}
              </div>

              {/* Post area */}
              <div className="flex-1 p-1.5 space-y-1">
                {hourPosts.map((post) => (
                  <PostChip
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    status={post.status}
                    confidence={post.confidence}
                    scheduledAt={post.scheduledAt}
                    platforms={post.platforms}
                    hasMedia={post.media != null && post.media.length > 0}
                    onPreview={onPreview}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        {isToday && now.getHours() >= HOUR_START && now.getHours() <= HOUR_END && (
          <div
            className="absolute left-20 right-0 h-px bg-brand z-20"
            style={{
              top: `${((now.getHours() - HOUR_START) * 60 + now.getMinutes()) * (60 / 60) + 48}px`,
            }}
          >
            <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-brand" />
          </div>
        )}
      </div>
    </div>
  );
}
