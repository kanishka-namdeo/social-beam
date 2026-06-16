"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Info,
  Keyboard,
  Lightbulb,
  ListBullets,
  Sidebar,
  Spinner,
  Stack,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { useOneTimeNudge } from "@/hooks/use-one-time-nudge";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format } from "date-fns";
import { toast } from "sonner";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { RescheduleDialog } from "./reschedule-dialog";
import { PostPreviewDialog } from "./post-preview-dialog";
import { InsightsSidebar } from "./insights-sidebar";
import { BulkScheduleDialog } from "./bulk-schedule-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { TimezoneSelector } from "./timezone-selector";
import { CategoryFilter } from "./category-filter";
import { AnalyticsOverlay } from "./analytics-overlay";
import { CalendarShortcuts } from "./calendar-shortcuts";
import { BatchActionBar } from "./batch-action-bar";
import { AddNoteDialog } from "./add-note-dialog";
import { useCalendarShortcuts } from "@/lib/hooks/use-calendar-shortcuts";
import type { PostItem, IdeaItem, CalendarNote } from "./types";

type CalendarView = "month" | "week" | "day" | "list";

function MonthErrorBanners({
  errors,
  onRetry,
}: {
  errors: Map<string, number>;
  onRetry: (key: string) => void;
}) {
  return (
    <>
      {Array.from(errors.keys()).map((key) => {
        const [yearStr, monthStr] = key.split("-");
        const errorDate = new Date(Number(yearStr), Number(monthStr));
        return (
          <div key={key} className="flex items-center gap-2 rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
            <Warning className="size-4 text-destructive shrink-0" weight="fill" />
            <span className="text-destructive flex-1">
              Failed to load posts for {format(errorDate, "MMMM yyyy")}.
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRetry(key)}>
              Retry
            </Button>
          </div>
        );
      })}
    </>
  );
}

interface CalendarClientProps {
  initialPosts: PostItem[];
  initialDate: string;
  connectedPlatforms: string[];
  platformContexts?: Array<{ platform: string; postingCadence: string | null }>;
}

export function CalendarClient({
  initialPosts,
  initialDate,
  connectedPlatforms,
  platformContexts,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date(initialDate));
  const [view, setView] = useState<CalendarView>("month");
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [showIdeas, setShowIdeas] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  // Insights sidebar toggle (mobile/tablet)
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Track latest month fetch to avoid duplicate requests
  const lastFetchedMonthRef = useRef<string>(`${new Date(initialDate).getFullYear()}-${new Date(initialDate).getMonth()}`);

  // AbortController ref to cancel previous fetch on rapid navigation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Loading state for month navigation
  const [monthLoading, setMonthLoading] = useState(false);
  const dragDropTip = useOneTimeNudge("calendar-drag-drop");

  // Track fetch errors per month (key: "YYYY-M")
  const [monthFetchErrors, setMonthFetchErrors] = useState<Map<string, number>>(new Map());

  // Reschedule dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPostId, setDialogPostId] = useState<string | null>(null);
  const [dialogOriginalDate, setDialogOriginalDate] = useState<string | null>(null);
  const [dialogTargetDate, setDialogTargetDate] = useState<Date | null>(null);
  const [dialogSuggestedHour, setDialogSuggestedHour] = useState<number | null>(null);
  const [dialogPlatforms, setDialogPlatforms] = useState<string[] | null>(null);

  // Preview dialog state
  const [previewPost, setPreviewPost] = useState<PostItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Bulk schedule and CSV import dialogs
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Phase 5: Timezone, notes, categories, analytics, shortcuts, batch selection
  const [timezone, setTimezone] = useState<string>("UTC");
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [addNoteDate, setAddNoteDate] = useState<Date | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [lastSelectedPostId, setLastSelectedPostId] = useState<string | null>(null);

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
  const fetchPostsForMonth = useCallback(async (date: Date, forceRefetch = false) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!forceRefetch && key === lastFetchedMonthRef.current) return;

    // Abort previous fetch to prevent race conditions
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    lastFetchedMonthRef.current = key;
    setMonthLoading(true);

    const year = date.getFullYear();
    const month = date.getMonth();
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        timezone,
      });
      if (showAnalytics) {
        params.set("includeAnalytics", "true");
      }
      const res = await fetch(`/api/calendar/posts?${params}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setMonthFetchErrors((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        setMonthFetchErrors((prev) => {
          const next = new Map(prev);
          next.set(key, (next.get(key) ?? 0) + 1);
          return next;
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setMonthFetchErrors((prev) => {
        const next = new Map(prev);
        next.set(key, (next.get(key) ?? 0) + 1);
        return next;
      });
    } finally {
      if (!controller.signal.aborted) {
        setMonthLoading(false);
      }
    }
  }, [timezone, showAnalytics]);

  // Fetch ideas for a given month
  const fetchIdeasForMonth = useCallback(async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    try {
      const res = await fetch(`/api/calendar/ideas?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas);
      }
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
    }
  }, []);

  // Fetch notes for a given month
  const fetchNotesForMonth = useCallback(async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    try {
      const res = await fetch(`/api/calendar/notes?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  }, []);

  // Fetch posts on initial mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPostsForMonth(currentDate);
    void fetchIdeasForMonth(currentDate);
    void fetchNotesForMonth(currentDate);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter posts by platform and category
  const filteredPosts = useMemo(() => {
    let result = filterPlatform === "all"
      ? posts
      : posts.filter((p) => p.platforms.some((pl) => pl.platform === filterPlatform));
    
    if (selectedCategories.length > 0) {
      result = result.filter((p) => p.category && selectedCategories.includes(p.category));
    }
    
    return result;
  }, [posts, filterPlatform, selectedCategories]);

  // Navigation handlers — update date and fetch posts
  const navigateAndFetch = useCallback((updater: (d: Date) => Date) => {
    setCurrentDate((prev) => {
      const next = updater(prev);
      void fetchPostsForMonth(next);
      void fetchIdeasForMonth(next);
      return next;
    });
  }, [fetchPostsForMonth, fetchIdeasForMonth]);

  const retryFailedMonth = useCallback((failedKey: string) => {
    const [yearStr, monthStr] = failedKey.split("-");
    const errorMonth = new Date(Number(yearStr), Number(monthStr));
    setMonthFetchErrors((prev) => {
      const next = new Map(prev);
      next.delete(failedKey);
      return next;
    });
    setCurrentDate(errorMonth);
    void fetchPostsForMonth(errorMonth, true);
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

    const activePostId = typeof active.id === "string"
      ? active.id.replace("post-", "")
      : null;

    if (!activePostId) return;

    const originalPost = posts.find((p) => p.id === activePostId);
    if (!originalPost) return;

    if (typeof over.id === "string" && over.id.startsWith("day-")) {
      // Dropped on a day cell (month view)
      const targetDateStr = over.id.replace("day-", "");
      const targetDate = new Date(targetDateStr);

      setDialogPostId(activePostId);
      setDialogOriginalDate(originalPost.scheduledAt);
      setDialogTargetDate(targetDate);
      setDialogSuggestedHour(null);
      setDialogPlatforms(null);
      setDialogOpen(true);
    } else if (typeof over.id === "string" && over.id.startsWith("hour-")) {
      // Dropped on an hour slot (week/day view)
      // Format: hour-YYYY-MM-DD-HH
      const parts = over.id.replace("hour-", "");
      const lastDash = parts.lastIndexOf("-");
      const dateStr = parts.substring(0, lastDash);
      const hourStr = parts.substring(lastDash + 1);
      const targetDate = new Date(dateStr + "T00:00:00");
      const hour = parseInt(hourStr, 10);

      // Extract platforms from the original post
      const platforms = originalPost.platforms.map((p) => p.platform);

      setDialogPostId(activePostId);
      setDialogOriginalDate(originalPost.scheduledAt);
      setDialogTargetDate(targetDate);
      setDialogSuggestedHour(hour);
      setDialogPlatforms(platforms);
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

  // Delete post — opens confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);

  const requestDelete = useCallback((postId: string) => {
    setPendingDeletePostId(postId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeletePostId) return;
    const res = await fetch(`/api/calendar/posts?postId=${pendingDeletePostId}`, { method: "DELETE" });
    if (!res.ok) {
      notifyErrorWithCategory("Failed to delete post", { category: "post_publish" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== pendingDeletePostId));
    notifySuccessWithCategory("Post deleted", { category: "post_publish" });
    setPendingDeletePostId(null);
  }, [pendingDeletePostId]);

  // Duplicate post
  const handleDuplicate = async (postId: string) => {
    const res = await fetch("/api/calendar/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (!res.ok) {
      notifyErrorWithCategory("Failed to duplicate post", { category: "post_publish" });
      return;
    }
    // Refresh current month to include the new post
    void fetchPostsForMonth(currentDate);
    notifySuccessWithCategory("Post duplicated", { category: "post_publish" });
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

  // AI fill gaps with ideas
  const handleAiFill = useCallback(async (dates: Date[]) => {
    try {
      // Generate ideas for the gap dates
      const response = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: dates.length,
          context: "Fill empty calendar slots",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate ideas");

      const { ideas } = await response.json();

      // Create ideas with target dates
      await Promise.all(
        ideas.map((idea: any, index: number) =>
          fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...idea,
              targetDate: dates[index]?.toISOString(),
            }),
          })
        )
      );

      // Refresh ideas for current month
      await fetchIdeasForMonth(currentDate);
    } catch (error) {
      console.error("AI fill failed:", error);
      throw error;
    }
  }, [currentDate, fetchIdeasForMonth]);

  // Keyboard shortcuts
  const { showHelp, setShowHelp } = useCalendarShortcuts({
    setView,
    goToday,
    goNext,
    goPrev,
  });

  // Selection handlers
  const handleSelectPost = useCallback((postId: string, e: React.MouseEvent) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedPostId) {
        // Range selection
        const postIds = filteredPosts.map((p) => p.id);
        const startIdx = postIds.indexOf(lastSelectedPostId);
        const endIdx = postIds.indexOf(postId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = from; i <= to; i++) {
            next.add(postIds[i]);
          }
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
      } else {
        // Single selection
        next.clear();
        next.add(postId);
      }
      return next;
    });
    setLastSelectedPostId(postId);
  }, [lastSelectedPostId, filteredPosts]);

  const handleClearSelection = useCallback(() => {
    setSelectedPostIds(new Set());
    setLastSelectedPostId(null);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedPostIds.size === 0) return;
    
    const confirmed = window.confirm(`Delete ${selectedPostIds.size} post(s)?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedPostIds).map((id) =>
          fetch(`/api/calendar/posts?postId=${id}`, { method: "DELETE" })
        )
      );
      setPosts((prev) => prev.filter((p) => !selectedPostIds.has(p.id)));
      handleClearSelection();
      notifySuccessWithCategory(`${selectedPostIds.size} post(s) deleted`, { category: "post_publish" });
    } catch (error) {
      notifyErrorWithCategory("Failed to delete posts", { category: "post_publish" });
    }
  }, [selectedPostIds, handleClearSelection]);

  const handleBatchReschedule = useCallback(() => {
    // TODO: Implement batch reschedule dialog
    toast.info("Batch reschedule coming soon");
  }, []);

  const handleTimezoneChange = useCallback((newTimezone: string) => {
    setTimezone(newTimezone);
    // Refetch posts with new timezone
    void fetchPostsForMonth(currentDate, true);
  }, [currentDate, fetchPostsForMonth]);

  const handleToggleAnalytics = useCallback(() => {
    setShowAnalytics((prev) => !prev);
    // Refetch posts with analytics
    void fetchPostsForMonth(currentDate, true);
  }, [currentDate, fetchPostsForMonth]);

  const handleAddNote = useCallback((date: Date) => {
    setAddNoteDate(date);
    setAddNoteDialogOpen(true);
  }, []);

  const handleNoteCreated = useCallback(() => {
    void fetchNotesForMonth(currentDate);
  }, [currentDate, fetchNotesForMonth]);

  // Extract categories from posts
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    posts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [posts]);

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
      {/* Toolbar — shared across all breakpoints */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {dragDropTip.isVisible && (
          <div className="flex items-center gap-1.5 rounded-sm border border-border bg-ai-surface/30 px-2 py-1 text-xs text-muted-foreground">
            <Info className="size-3 text-brand" weight="fill" />
            <span>Drag posts to reschedule them. Drop on AI-suggested times (marked with *) for optimal engagement</span>
            <button
              type="button"
              onClick={dragDropTip.dismiss}
              className="ml-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss tip"
            >
              <X className="size-3" weight="bold" />
            </button>
          </div>
        )}
        {!dragDropTip.isVisible && (
          <HintTooltip
            hint="Tip: Drag posts to reschedule them. Drop on AI-suggested times (marked with *) for optimal engagement"
            icon="info"
          />
        )}
        {/* Navigation */}
        {view !== "list" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous" disabled={monthLoading}>
              <CaretLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} disabled={monthLoading}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Next" disabled={monthLoading}>
              <CaretRight className="size-4" />
            </Button>
            {monthLoading && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3 animate-spin" weight="bold" />
                Loading...
              </span>
            )}
          </div>
        )}

        {/* Current period label */}
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarDots className="size-5 text-brand" weight="regular" />
          {headerLabel()}
          {(() => {
            const currentKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
            if (monthFetchErrors.has(currentKey)) {
              return (
                <Warning className="size-4 text-destructive" weight="fill" aria-label="Failed to load this month" />
              );
            }
            return null;
          })()}
        </h2>

        {/* View selector with Tabs — line variant */}
        <div className="ml-auto flex-between gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList variant="line">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>

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

          {/* Show Ideas toggle */}
          <Button
            variant={showIdeas ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-1.5",
              showIdeas && "bg-brand hover:bg-brand/90"
            )}
            onClick={() => setShowIdeas(!showIdeas)}
            aria-pressed={showIdeas}
            aria-label="Toggle ideas on calendar"
          >
            <Lightbulb className="size-4" weight={showIdeas ? "fill" : "regular"} />
            <span className="hidden sm:inline">Ideas</span>
          </Button>

          {/* Phase 5: Timezone selector */}
          <TimezoneSelector value={timezone} onChange={handleTimezoneChange} />

          {/* Phase 5: Category filter */}
          <CategoryFilter
            categories={availableCategories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />

          {/* Phase 5: Analytics overlay toggle */}
          <AnalyticsOverlay active={showAnalytics} onToggle={handleToggleAnalytics} />

          {/* Phase 5: Keyboard shortcuts help */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(true)}
            aria-label="Show keyboard shortcuts"
            className="gap-1.5"
          >
            <Keyboard className="size-4" />
            <span className="hidden sm:inline">?</span>
          </Button>

          {/* Insights toggle — mobile/tablet only */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setInsightsOpen(!insightsOpen)}
            aria-label={insightsOpen ? "Hide insights" : "Show insights"}
            aria-expanded={insightsOpen}
          >
            {insightsOpen ? (
              <X className="size-4" weight="regular" />
            ) : (
              <Sidebar className="size-4" weight="regular" />
            )}
          </Button>
        </div>
      </div>

      {/* Spacer between toolbar and calendar content */}

      {/* Month fetch error banner */}
      {monthFetchErrors.size > 0 && (
        <MonthErrorBanners errors={monthFetchErrors} onRetry={retryFailedMonth} />
      )}

      {/* Mobile/tablet layout — single panel with Sheet */}
      <div className="lg:hidden space-y-4">
        {/* Calendar views */}
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            posts={filteredPosts}
            ideas={showIdeas ? ideas : []}
            notes={notes}
            selectedPostIds={selectedPostIds}
            onSelectPost={handleSelectPost}
            showAnalyticsOverlay={showAnalytics}
            onDateClick={handleDateClick}
            onPreview={handlePreview}
            onDelete={requestDelete}
            onDuplicate={handleDuplicate}
            onAddNote={handleAddNote}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            posts={filteredPosts}
            onPreview={handlePreview}
            onDelete={requestDelete}
            onDuplicate={handleDuplicate}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            posts={filteredPosts}
            onPreview={handlePreview}
            onDelete={requestDelete}
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

        {/* Empty state — mobile/tablet */}
        {posts.length === 0 && view !== "list" && (
          <div className="rounded-sm border border-dashed border-border p-empty text-center">
            <CalendarDots className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
            <h3 className="text-base font-medium tracking-tight text-foreground">No posts scheduled</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first post to see it on the calendar.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
              Compose a Post
            </Button>
          </div>
        )}

        {posts.length === 0 && view === "list" && (
          <div className="rounded-sm border border-dashed border-border p-empty text-center">
            <ListBullets className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
            <h3 className="text-base font-medium tracking-tight text-foreground">No posts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start composing to see your posts here.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
              Compose a Post
            </Button>
          </div>
        )}
      </div>

      {/* Desktop layout — split panels */}
      <div className="hidden lg:flex flex-col h-dashboard">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="65" minSize={40}>
            <div className="h-full overflow-y-auto p-3 relative">
              {monthLoading && (
                <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-sm">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                </div>
              )}
              {/* Calendar views */}
              {view === "month" && (
                <MonthView
                  currentDate={currentDate}
                  posts={filteredPosts}
                  ideas={showIdeas ? ideas : []}
                  notes={notes}
                  selectedPostIds={selectedPostIds}
                  onSelectPost={handleSelectPost}
                  showAnalyticsOverlay={showAnalytics}
                  onDateClick={handleDateClick}
                  onPreview={handlePreview}
                  onDelete={requestDelete}
                  onDuplicate={handleDuplicate}
                  onAddNote={handleAddNote}
                />
              )}
              {view === "week" && (
                <WeekView
                  currentDate={currentDate}
                  posts={filteredPosts}
                  onPreview={handlePreview}
                  onDelete={requestDelete}
                  onDuplicate={handleDuplicate}
                />
              )}
              {view === "day" && (
                <DayView
                  currentDate={currentDate}
                  posts={filteredPosts}
                  onPreview={handlePreview}
                  onDelete={requestDelete}
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

              {/* Empty state — desktop */}
              {posts.length === 0 && view !== "list" && (
                <div className="rounded-sm border border-dashed border-border p-empty text-center">
                  <CalendarDots className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
                  <h3 className="text-base font-medium tracking-tight text-foreground">No posts scheduled</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first post to see it on the calendar.
                  </p>
                  <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
                    Compose a Post
                  </Button>
                </div>
              )}

              {posts.length === 0 && view === "list" && (
                <div className="rounded-sm border border-dashed border-border p-empty text-center">
                  <ListBullets className="mx-auto mb-4 size-12 text-muted-foreground/50" weight="thin" />
                  <h3 className="text-base font-medium tracking-tight text-foreground">No posts yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start composing to see your posts here.
                  </p>
                  <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/compose")}>
                    Compose a Post
                  </Button>
                </div>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle
            withHandle
            aria-label="Resize panels"
            className="min-h-[40px]"
          />
          <ResizablePanel defaultSize="35" minSize={20} collapsible>
            <div className="h-full overflow-y-auto">
              <InsightsSidebar
                view={view}
                filteredPosts={filteredPosts}
                onComposeForSlot={handleComposeForSlot}
                platformContexts={platformContexts}
                onAiFill={handleAiFill}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Insights Sheet — mobile/tablet */}
      <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
        <SheetContent side="right" className="w-80 sm:w-96 md:w-[24rem] overflow-y-auto p-0">
          <InsightsSidebar
            view={view}
            filteredPosts={filteredPosts}
            onComposeForSlot={handleComposeForSlot}
            platformContexts={platformContexts}
            onAiFill={handleAiFill}
          />
        </SheetContent>
      </Sheet>

      {/* Reschedule dialog */}
      <RescheduleDialog
        open={dialogOpen}
        postId={dialogPostId}
        originalDate={dialogOriginalDate}
        targetDate={dialogTargetDate}
        platforms={dialogPlatforms ?? undefined}
        suggestedHour={dialogSuggestedHour}
        onClose={() => {
          setDialogOpen(false);
          setDialogPostId(null);
          setDialogOriginalDate(null);
          setDialogTargetDate(null);
          setDialogSuggestedHour(null);
          setDialogPlatforms(null);
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
        onDelete={requestDelete}
        onDuplicate={handleDuplicate}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete post?"
        description="This action cannot be undone. The post will be permanently removed."
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* Bulk schedule dialog */}
      <BulkScheduleDialog
        open={bulkScheduleOpen}
        onOpenChange={setBulkScheduleOpen}
        onSuccess={() => fetchPostsForMonth(currentDate, true)}
      />

      {/* CSV import dialog */}
      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onSuccess={() => fetchPostsForMonth(currentDate, true)}
      />

      {/* Phase 5: Keyboard shortcuts dialog */}
      <CalendarShortcuts
        open={showHelp}
        onOpenChange={setShowHelp}
      />

      {/* Phase 5: Batch action bar */}
      {selectedPostIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedPostIds.size}
          onReschedule={handleBatchReschedule}
          onDelete={handleBatchDelete}
          onClear={handleClearSelection}
        />
      )}

      {/* Phase 5: Add note dialog */}
      {addNoteDate && (
        <AddNoteDialog
          open={addNoteDialogOpen}
          onOpenChange={setAddNoteDialogOpen}
          date={addNoteDate}
          onSuccess={handleNoteCreated}
        />
      )}
    </DndContext>
  );
}
