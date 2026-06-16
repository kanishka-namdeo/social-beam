"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { CalendarPlus, Lightbulb } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PostChip } from "./post-chip";
import { QuickAddForm } from "./quick-add-form";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

import type { PostItem, MediaItem, IdeaItem } from "./types";

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend?: boolean;
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
  connectedPlatforms?: string[];
  onIdeaClick?: (idea: IdeaItem) => void;
  onAddNote?: (date: Date) => void;
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isWeekend = false,
  posts,
  ideas = [],
  notes = [],
  selectedPostIds,
  onSelectPost,
  showAnalyticsOverlay = false,
  onDateClick,
  onPreview,
  onDelete,
  onDuplicate,
  connectedPlatforms,
  onIdeaClick,
  onAddNote,
}: DayCellProps) {
  const { config } = useInvisibleAI();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
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

  const handleCellClick = () => {
    if (showGapIndicator) {
      setShowQuickAdd((prev) => !prev);
    }
  };

  const handleQuickAddSuccess = () => {
    setShowQuickAdd(false);
    if (onDateClick) {
      onDateClick(date);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[120px] flex-col rounded-sm border border-border p-2 transition-colors duration-normal",
        isCurrentMonth
          ? "bg-card"
          : "border-dashed border-border/50 bg-muted/10",
        isToday && "bg-brand/10 border-l-2 border-l-brand",
        isWeekend && !isToday && "bg-muted/20",
        isOver && "border-2 border-dashed border-brand bg-brand/10",
        !isOver && isCurrentMonth && "hover:bg-muted/50",
        showGapIndicator && "cursor-pointer",
      )}
      onClick={handleCellClick}
    >
      {/* Date header */}
      <div className="flex-between mb-1.5">
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
          <span
            className="group/gap relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickAdd((prev) => !prev);
            }}
          >
            <CalendarPlus className="size-3.5 text-brand/60" weight="bold" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/gap:block whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-micro text-background shadow-lg">
              {config.showAILabels ? "AI suggests posting here" : "Suggested slot"}
            </span>
          </span>
        )}
      </div>

      {/* Quick-add form */}
      {showQuickAdd && (
        <div className="mb-1.5" onClick={(e) => e.stopPropagation()}>
          <QuickAddForm
            date={date}
            onSuccess={handleQuickAddSuccess}
            onCancel={() => setShowQuickAdd(false)}
            connectedPlatforms={connectedPlatforms}
          />
        </div>
      )}

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
          ))}
          
          {/* Ideas list */}
          {ideas.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onIdeaClick?.(idea);
                  }}
                  className={cn(
                    "group/idea flex items-start gap-1.5 rounded-sm border border-dashed border-border bg-brand/5 px-2 py-1 text-xs cursor-pointer hover:bg-brand/10 transition-colors",
                  )}
                >
                  <Lightbulb className="size-3 text-brand shrink-0 mt-0.5" weight="fill" />
                  <span className="line-clamp-1 text-foreground">{idea.title}</span>
                </div>
              ))}
            </div>
          )}
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
