"use client";

import { startOfMonth, startOfWeek, isSameMonth, isSameDay, addDays } from "date-fns";
import { DayCell } from "./day-cell";
import type { PostItem } from "./types";

interface MonthViewProps {
  currentDate: Date;
  posts: PostItem[];
  onDateClick?: (date: Date) => void;
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onDuplicate?: (postId: string) => Promise<void>;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({ currentDate, posts, onDateClick, onPreview, onDelete, onDuplicate }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);

  // Group posts by date string for efficient lookup
  const postsByDate = new Map<string, PostItem[]>();
  for (const post of posts) {
    if (!post.scheduledAt) continue;
    const postDate = new Date(post.scheduledAt);
    const key = postDate.toDateString();
    if (!postsByDate.has(key)) {
      postsByDate.set(key, []);
    }
    postsByDate.get(key)!.push(post);
  }

  // Build 6-week grid (42 cells)
  const gridDays: Date[] = [];
  let day = calendarStart;
  const today = new Date();

  while (gridDays.length < 42) {
    gridDays.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="space-y-2">
      {/* Day name headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((dayDate) => {
          const isCurrentMonth = isSameMonth(dayDate, currentDate);
          const isToday = isSameDay(dayDate, today);
          const dayPosts = postsByDate.get(dayDate.toDateString()) ?? [];

          return (
            <DayCell
              key={dayDate.toISOString()}
              date={dayDate}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              posts={dayPosts}
              onDateClick={onDateClick}
              onPreview={onPreview}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          );
        })}
      </div>
    </div>
  );
}
