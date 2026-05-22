"use client";

import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
} from "@dnd-kit/core";
import {
  CaretLeft,
  CaretRight,
  CalendarDots,
  Sparkle,
  ListBullets,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format } from "date-fns";
import { toast } from "sonner";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { RescheduleDialog } from "./reschedule-dialog";
import { PostPreviewDialog } from "./post-preview-dialog";
import { ContentGapAnalysis } from "./content-gap-analysis";
import { PostingFrequency } from "./posting-frequency";
import type { PostItem } from "./types";

type CalendarView = "month" | "week" | "day" | "list";

interface CalendarClientProps {
  initialPosts: PostItem[];
  initialDate: string;
  connectedPlatforms: string[];
}

export function CalendarClient({
  initialPosts,
  initialDate,
  connectedPlatforms,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date(initialDate));
  const [view, setView] = useState<CalendarView>("month");
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  // Track latest month fetch to avoid duplicate requests
  const lastFetchedMonthRef = useRef<string>(`${new Date(initialDate).getFullYear()}-${new Date(initialDate).getMonth()}`);

  // Reschedule dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPostId, setDialogPostId] = useState<string | null>(null);
  const [dialogOriginalDate, setDialogOriginalDate] = useState<string | null>(null);
  const [dialogTargetDate, setDialogTargetDate] = useState<Date | null>(null);

  // Preview dialog state
  const [previewPost, setPreviewPost] = useState<PostItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Fetch posts for a given month
  const fetchPostsForMonth = useCallback(async (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key === lastFetchedMonthRef.current) return;
    lastFetchedMonthRef.current = key;

    const year = date.getFullYear();
    const month = date.getMonth();
    try {
      const res = await fetch(`/api/calendar/posts?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch {
      // Silent fail — keep existing posts
    }
  }, []);

  // Filter posts by platform
  const filteredPosts = filterPlatform === "all"
    ? posts
    : posts.filter((p) => p.platforms.some((pl) => pl.platform === filterPlatform));

  // Navigation handlers — update date and fetch posts
  const navigateAndFetch = useCallback((updater: (d: Date) => Date) => {
    setCurrentDate((prev) => {
      const next = updater(prev);
      void fetchPostsForMonth(next);
      return next;
    });
  }, [fetchPostsForMonth]);

  const goPrev = () => {
    if (view === "month") navigateAndFetch((d) => subMonths(d, 1));
    else if (view === "week") navigateAndFetch((d) => subWeeks(d, 1));
    else if (view === "day") navigateAndFetch((d) => subDays(d, 1));
  };

  const goNext = () => {
    if (view === "month") navigateAndFetch((d) => addMonths(d, 1));
    else if (view === "week") navigateAndFetch((d) => addWeeks(d, 1));
    else if (view === "day") navigateAndFetch((d) => addDays(d, 1));
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    void fetchPostsForMonth(today);
  };

  // Drag-end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active) return;

    // Check if dropped on a day cell
    if (typeof over.id === "string" && over.id.startsWith("day-")) {
      const activePostId = typeof active.id === "string"
        ? active.id.replace("post-", "")
        : null;

      if (!activePostId) return;

      // Parse target date from droppable id
      const targetDateStr = over.id.replace("day-", "");
      const targetDate = new Date(targetDateStr);

      // Find original scheduled date
      const originalPost = posts.find((p) => p.id === activePostId);
      if (!originalPost) return;

      setDialogPostId(activePostId);
      setDialogOriginalDate(originalPost.scheduledAt);
      setDialogTargetDate(targetDate);
      setDialogOpen(true);
    }
  };

  // Confirm reschedule
  const handleConfirmReschedule = async (postId: string, newScheduledAt: string) => {
    const res = await fetch("/api/calendar/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, newScheduledAt }),
    });

    if (!res.ok) {
      throw new Error("Failed to reschedule");
    }

    // Update local state
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, scheduledAt: newScheduledAt, status: "SCHEDULED" }
          : p
      )
    );
  };

  // Delete post
  const handleDelete = async (postId: string) => {
    const res = await fetch(`/api/calendar/posts?postId=${postId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete post");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post deleted");
  };

  // Duplicate post
  const handleDuplicate = async (postId: string) => {
    const res = await fetch("/api/calendar/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (!res.ok) {
      toast.error("Failed to duplicate post");
      return;
    }
    // Refresh current month to include the new post
    void fetchPostsForMonth(currentDate);
    toast.success("Post duplicated");
  };

  // Preview handler
  const handlePreview = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setPreviewPost(post);
      setPreviewOpen(true);
    }
  }, [posts]);

  // Edit handler — navigate to compose
  const handleEdit = useCallback((postId: string) => {
    window.location.href = `/dashboard/compose?postId=${postId}`;
  }, []);

  // Handle clicking on a gap indicator day
  const handleDateClick = (date: Date) => {
    window.location.href = `/dashboard/compose?date=${date.toISOString().slice(0, 10)}`;
  };

  // Compose for a specific gap slot
  const handleComposeForSlot = useCallback((date: Date) => {
    window.location.href = `/dashboard/compose?date=${date.toISOString().slice(0, 10)}`;
  }, []);

  // Header label based on view
  const headerLabel = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const weekStart = format(currentDate, "MMM d");
      const weekEnd = format(addDays(currentDate, 6), "MMM d, yyyy");
      return `${weekStart} — ${weekEnd}`;
    }
    if (view === "list") return "All Posts";
    return format(currentDate, "MMMM d, yyyy");
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation */}
          {view !== "list" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous">
                <CaretLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goNext} aria-label="Next">
                <CaretRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Current period label */}
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarDots className="size-5 text-brand" weight="regular" />
            {headerLabel()}
          </h2>

          {/* View selector */}
          <div className="ml-auto flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>

            {/* Platform filter */}
            {connectedPlatforms.length > 0 && (
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {connectedPlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* AI tip — only for calendar views */}
        {view !== "list" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-ai-surface/50 rounded-lg px-3 py-2">
            <Sparkle className="size-3.5 text-brand" weight="fill" />
            <span>Click any post to preview. Drag between days to reschedule. Empty days with a <CalendarDots className="size-3 inline" /> icon are AI-suggested posting opportunities.</span>
          </div>
        )}

        {/* Content gap analysis — month view */}
        {view === "month" && (
          <ContentGapAnalysis
            posts={filteredPosts}
            onComposeForSlot={handleComposeForSlot}
          />
        )}

        {/* Posting frequency — month view */}
        {view === "month" && <PostingFrequency posts={filteredPosts} />}

        {/* Calendar content */}
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            posts={filteredPosts}
            onDateClick={handleDateClick}
            onPreview={handlePreview}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            posts={filteredPosts}
            onPreview={handlePreview}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            posts={filteredPosts}
            onPreview={handlePreview}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        )}
        {view === "list" && (
          <ListView
            posts={filteredPosts}
            connectedPlatforms={connectedPlatforms}
            onPreview={handlePreview}
            onEdit={handleEdit}
          />
        )}

        {/* Empty state */}
        {posts.length === 0 && view !== "list" && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <CalendarDots className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
            <h3 className="text-base font-semibold text-foreground">No posts scheduled</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first post to see it on the calendar.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
              Compose a Post
            </Button>
          </div>
        )}

        {posts.length === 0 && view === "list" && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <ListBullets className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
            <h3 className="text-base font-semibold text-foreground">No posts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start composing to see your posts here.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
              Compose a Post
            </Button>
          </div>
        )}
      </div>

      {/* Reschedule dialog */}
      <RescheduleDialog
        open={dialogOpen}
        postId={dialogPostId}
        originalDate={dialogOriginalDate}
        targetDate={dialogTargetDate}
        onClose={() => {
          setDialogOpen(false);
          setDialogPostId(null);
          setDialogOriginalDate(null);
          setDialogTargetDate(null);
        }}
        onConfirm={handleConfirmReschedule}
      />

      {/* Post preview dialog */}
      <PostPreviewDialog
        open={previewOpen}
        post={previewPost}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewPost(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </DndContext>
  );
}
