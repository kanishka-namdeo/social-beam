"use client";

import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PostChip } from "./post-chip";
import { HourSlot } from "./hour-slot";
import type { PostItem, MediaItem } from "./types";

interface WeekViewProps {
  currentDate: Date;
  posts: PostItem[];
  selectedPostIds?: Set<string>;
  onSelectPost?: (id: string, e: React.MouseEvent) => void;
  showAnalyticsOverlay?: boolean;
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (postId: string) => Promise<void>;
}

const HOUR_START = 6; // 6 AM
const HOUR_END = 22; // 10 PM
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekView({ currentDate, posts, selectedPostIds, onSelectPost, showAnalyticsOverlay = false, onPreview, onDelete, onDuplicate }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  const now = new Date();
  const todayIndex = weekDays.findIndex((day) => day.toDateString() === now.toDateString());
  const isTodayInWeek = todayIndex !== -1;
  const isCurrentTimeInRange = now.getHours() >= HOUR_START && now.getHours() <= HOUR_END;

  const handleHourClick = (day: Date, hour: number) => {
    const dateStr = day.toISOString().split("T")[0];
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    window.location.href = `/dashboard/compose?date=${dateStr}&time=${timeStr}`;
  };

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-8 border-b border-border bg-muted/30">
        <div className="p-2.5 border-r border-border w-16" />
        {weekDays.map((day) => {
          const isToday =
            day.toDateString() === now.toDateString();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2.5 text-center border-r border-border last:border-r-0",
                isToday && "border-l-2 border-l-brand bg-brand/10",
                day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/20" : "",
              )}
            >
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {DAY_NAMES[day.getDay()]}
              </div>
              <div
                className={cn(
                  "text-lg font-medium",
                  isToday
                    ? "text-brand mt-1"
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
      <div className="grid grid-cols-8 divide-x divide-border relative">
        {/* Time labels column */}
        <div className="w-16 divide-y divide-border">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 flex items-start justify-end pr-2 text-micro text-muted-foreground tabular-nums"
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
              {/* Hour slots - droppable */}
              {hours.map((hour) => (
                <HourSlot key={hour} date={day} hour={hour} onClick={handleHourClick} />
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
                      category={post.category}
                      analytics={post.analytics}
                      compact
                      media={post.media as MediaItem[] | undefined}
                      isSelected={selectedPostIds?.has(post.id)}
                      onSelect={onSelectPost}
                      showAnalyticsOverlay={showAnalyticsOverlay}
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

        {/* Current time indicator for today */}
        {isTodayInWeek && isCurrentTimeInRange && (
          <div
            className="absolute h-px bg-brand z-20 pointer-events-none"
            style={{
              top: `${((now.getHours() - HOUR_START) * 60 + now.getMinutes()) * (48 / 60)}px`,
              left: `calc(${todayIndex + 1} / 8 * 100%)`,
              width: `calc(1 / 8 * 100%)`,
            }}
          >
            <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-brand" />
          </div>
        )}
      </div>
    </div>
  );
}
