"use client";

import { useDroppable } from "@dnd-kit/core";
import { CalendarPlus } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PostChip } from "./post-chip";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

import type { PostItem } from "./types";

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend?: boolean;
  posts: PostItem[];
  onDateClick?: (date: Date) => void;
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (postId: string) => Promise<void>;
}

export function DayCell({ date, isCurrentMonth, isToday, isWeekend = false, posts, onDateClick, onPreview, onDelete, onDuplicate }: DayCellProps) {
  const { config } = useInvisibleAI();
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: {
      type: "day",
      date: date.toISOString(),
    },
  });

  const isFuture = date >= new Date(new Date().toDateString());
  const hasPosts = posts.length > 0;
  const showGapIndicator = !hasPosts && isFuture && isCurrentMonth;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[120px] flex-col rounded-sm border border-border p-2 transition-colors duration-150",
        isCurrentMonth
          ? "bg-card"
          : "border-dashed border-border/50 bg-muted/10",
        isToday && "bg-brand/10 border-l-2 border-l-brand",
        isWeekend && !isToday && "bg-muted/20",
        isOver && "border-2 border-dashed border-brand bg-brand/10",
        !isOver && isCurrentMonth && "hover:bg-muted/50",
        showGapIndicator && "cursor-pointer",
      )}
      onClick={() => {
        if (showGapIndicator && onDateClick) {
          onDateClick(date);
        }
      }}
    >
      {/* Date header */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
            isToday && "font-semibold text-brand",
          )}
        >
          {date.getDate()}
        </span>
        {showGapIndicator && (
          <span className="group/gap relative">
            <CalendarPlus className="size-3.5 text-brand/60" weight="bold" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/gap:block z-50 whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-[0.625rem] text-background shadow-lg">
              {config.showAILabels ? "AI suggests posting here" : "Suggested slot"}
            </span>
          </span>
        )}
      </div>

      {/* Posts list */}
      <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {posts.map((post) => (
            <PostChip
              key={post.id}
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
          ))}
        </div>
      </SortableContext>

      {/* More indicator */}
      {posts.length > 3 && (
        <span className="text-xs text-muted-foreground mt-0.5 px-1">
          +{posts.length - 3} more
        </span>
      )}
    </div>
  );
}
