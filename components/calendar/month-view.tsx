"use client";

import { startOfMonth, startOfWeek, isSameMonth, isSameDay, addDays } from "date-fns";
import { DayCell } from "./day-cell";
import type { PostItem, IdeaItem } from "./types";

interface MonthViewProps {
  currentDate: Date;
  posts: PostItem[];
  ideas?: IdeaItem[];
  notes?: Array<{ id: string; title: string; color: string | null; blockScheduling: boolean }>;
  selectedPostIds?: Set<string>;
  onSelectPost?: (id: string, e: React.MouseEvent) => void;
  showAnalyticsOverlay?: boolean;
  onDateClick?: (date: Date) => void;
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (postId: string) => Promise<void>;
  onIdeaClick?: (idea: IdeaItem) => void;
  onAddNote?: (date: Date) => void;
  connectedPlatforms?: string[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({ currentDate, posts, ideas = [], notes = [], selectedPostIds, onSelectPost, showAnalyticsOverlay = false, onDateClick, onPreview, onDelete, onDuplicate, onIdeaClick, onAddNote, connectedPlatforms }: MonthViewProps) {
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

  // Group ideas by date string
  const ideasByDate = new Map<string, IdeaItem[]>();
  for (const idea of ideas) {
    if (!idea.targetDate) continue;
    const ideaDate = new Date(idea.targetDate);
    const key = ideaDate.toDateString();
    if (!ideasByDate.has(key)) {
      ideasByDate.set(key, []);
    }
    ideasByDate.get(key)!.push(idea);
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
      <div className="grid grid-cols-7 gap-1 rounded-sm overflow-hidden">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-xs font-medium uppercase tracking-tight text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 rounded-sm border border-border overflow-hidden">
        {gridDays.map((dayDate) => {
          const isCurrentMonth = isSameMonth(dayDate, currentDate);
          const isToday = isSameDay(dayDate, today);
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayPosts = postsByDate.get(dayDate.toDateString()) ?? [];
          const dayIdeas = ideasByDate.get(dayDate.toDateString()) ?? [];

          return (
            <DayCell
              key={dayDate.toISOString()}
              date={dayDate}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              isWeekend={isWeekend}
              posts={dayPosts}
              ideas={dayIdeas}
              notes={notes}
              selectedPostIds={selectedPostIds}
              onSelectPost={onSelectPost}
              showAnalyticsOverlay={showAnalyticsOverlay}
              onDateClick={onDateClick}
              onPreview={onPreview}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              connectedPlatforms={connectedPlatforms}
              onIdeaClick={onIdeaClick}
              onAddNote={onAddNote}
            />
          );
        })}
      </div>
    </div>
  );
}
