"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactGridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import type { Layout, LayoutItem } from "react-grid-layout";
import { X } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./widget-grid-styles.css";

import { Button } from "@/components/ui/button";
import {
  type WidgetLayout,
  type WidgetLayoutItem,
  findNearestAllowedSize,
  getSizeConstraints,
  sizeToGrid,
} from "@/lib/dashboard/widget-registry";
import type { UserRole } from "@/lib/role-guard";
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";
import { renderWidgetContent } from "@/lib/dashboard/widget-renderers-v2";
import { WidgetSizePicker } from "@/components/dashboard/widget-size-picker";

interface DashboardData {
  recentPosts: Array<{
    id: string;
    title: string | null;
    status: string;
    confidence: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    platforms: Array<{ platform: string; status: string; error?: string | null }>;
  }>;
  scheduledPosts: Array<{
    id: string;
    title: string | null;
    platforms: string[];
    scheduledAt: string;
  }>;
  insights: {
    topPost?: {
      title: string;
      platform: string;
      engagementRate: number;
      likes: number;
      comments: number;
      shares: number;
    };
    trend?: {
      direction: "up" | "down";
      metric: string;
      value: string;
      period: string;
    };
    recommendation?: string;
  };
  quickStats: {
    totalPosts: number;
    scheduledCount: number;
    publishedThisWeek: number;
    failedCount: number;
  };
  connectedAccounts?: Array<{
    id: string;
    platform: string;
    platformUserId: string;
    status: string;
  }>;
}

interface WidgetGridProps {
  layout: WidgetLayout;
  data: DashboardData;
  userRole: UserRole;
}

function WidgetCard({
  entry,
  tier1Data,
  tier2Data,
  tier2Loading,
  userRole,
  onRemove,
  onResize,
}: {
  entry: WidgetLayoutItem;
  tier1Data: DashboardData;
  tier2Data: any;
  tier2Loading: boolean;
  userRole: UserRole;
  onRemove: (id: string) => void;
  onResize: (widgetId: string, newSizeToken: string) => void;
}) {
  return (
    <div className="group/widget relative overflow-hidden h-full">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
        <div
          className="widget-drag-handle p-1.5 rounded-sm bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Drag to reposition"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
        <WidgetSizePicker
          widgetId={entry.i}
          currentSize={entry.size}
          onResize={onResize}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 min-h-7 min-w-7 bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive transition-colors"
          onClick={() => onRemove(entry.i)}
        >
          <X className="size-3.5" weight="bold" />
        </Button>
      </div>
      <WidgetErrorBoundary widgetId={entry.i}>
        {renderWidgetContent(
          entry.i,
          entry.size,
          tier1Data,
          tier2Data,
          tier2Loading,
          userRole
        )}
      </WidgetErrorBoundary>
    </div>
  );
}

export function WidgetGrid({ layout, data, userRole }: WidgetGridProps) {
  const [widgets, setWidgets] = useState<WidgetLayoutItem[]>(
    layout.widgets as WidgetLayoutItem[]
  );
  const [tier2Data, setTier2Data] = useState<Record<string, unknown>>({});
  const [tier2Loading, setTier2Loading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  const visibleWidgets = widgets
    .filter((w) => w.visible !== false)
    .map((w) => {
      const constraints = getSizeConstraints(w.i);
      return { ...w, ...constraints };
    });

  // Fetch tier2 data for visible widgets via batched requests
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchTier2 = async () => {
      setTier2Loading(true);
      const ids = visibleWidgets.map((w) => w.i);
      if (ids.length === 0) {
        setTier2Loading(false);
        return;
      }

      const results: Record<string, unknown> = {};
      await Promise.all(
        ids.map(async (widgetId) => {
          try {
            const res = await fetch(
              `/api/dashboard/widgets?id=${encodeURIComponent(widgetId)}`,
              { signal: controller.signal }
            );
            if (res.ok) {
              const json = await res.json();
              results[widgetId] = json.data;
            }
          } catch {
            // Silently fail — widget renders with default data
          }
        })
      );

      if (!cancelled) {
        setTier2Data(results);
        setTier2Loading(false);
      }
    };

    fetchTier2();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [visibleWidgets.map((w) => w.i).join(",")]);

  const savePreferences = useCallback(
    async (updatedWidgets: WidgetLayoutItem[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/dashboard/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ widgets: updatedWidgets }),
          });
          if (!res.ok) {
            toast.error("Failed to save dashboard layout");
          }
        } catch {
          toast.error("Failed to save dashboard layout");
        }
      }, 300);
    },
    []
  );

  // Merge RGL layout positions back into our WidgetLayoutItem[] state
  const mergeLayout = useCallback(
    (newLayout: Layout): WidgetLayoutItem[] => {
      const layoutMap = new Map(newLayout.map((l) => [l.i, l]));
      return widgets.map((widget) => {
        const layoutItem = layoutMap.get(widget.i);
        if (!layoutItem) return widget;

        let newSize = widget.size;
        if (layoutItem.w !== widget.w || layoutItem.h !== widget.h) {
          const nearest = findNearestAllowedSize(
            { w: layoutItem.w, h: layoutItem.h },
            widget.i
          );
          if (nearest) newSize = nearest.token;
        }

        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
          size: newSize,
        };
      });
    },
    [widgets]
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const merged = mergeLayout(newLayout);
      setWidgets(merged);
    },
    [mergeLayout]
  );

  const handleDragStop: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
    element: HTMLElement | null
  ) => void = useCallback(
    (newLayout) => {
      const merged = mergeLayout(newLayout);
      setWidgets(merged);
      savePreferences(merged);
    },
    [mergeLayout, savePreferences]
  );

  const handleResizeStop: (
    layout: Layout,
    oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
    placeholder: LayoutItem | null,
    event: Event,
    element: HTMLElement | null
  ) => void = useCallback(
    (newLayout) => {
      const merged = mergeLayout(newLayout);

      // Snap each widget to its nearest allowed size
      const snapped = merged.map((widget) => {
        const nearest = findNearestAllowedSize(
          { w: widget.w, h: widget.h },
          widget.i
        );
        if (!nearest) return widget;

        return {
          ...widget,
          w: nearest.w,
          h: nearest.h,
          size: nearest.token,
        };
      });

      setWidgets(snapped);
      savePreferences(snapped);
    },
    [mergeLayout, savePreferences]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      const updated = widgets.filter((w) => w.i !== widgetId);
      setWidgets(updated);
      savePreferences(updated);
    },
    [widgets, savePreferences]
  );

  const handleWidgetResize = useCallback(
    (widgetId: string, newSizeToken: string) => {
      const grid = sizeToGrid(newSizeToken);
      const updated = widgets.map((w) => {
        if (w.i !== widgetId) return w;
        return { ...w, w: grid.w, h: grid.h, size: newSizeToken };
      });
      setWidgets(updated);
      savePreferences(updated);
      toast.success(`Widget resized to ${newSizeToken}`);
    },
    [widgets, savePreferences]
  );

  // Sync layout prop changes to state
  useEffect(() => {
    setWidgets(layout.widgets as WidgetLayoutItem[]);
  }, [layout.widgets]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef}>
      {mounted && width > 0 && (
        <ReactGridLayout
          layout={visibleWidgets}
          width={width}
          gridConfig={{
            cols: 10,
            rowHeight: 80,
            margin: [16, 16],
            containerPadding: [0, 0],
          }}
          dragConfig={{
            enabled: true,
            handle: ".widget-drag-handle",
            bounded: true,
            threshold: 8,
          }}
          resizeConfig={{
            enabled: true,
            handles: ["se", "e", "s"],
          }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
        >
          {visibleWidgets.map((entry) => (
            <div key={entry.i}>
              <WidgetCard
                entry={entry}
                tier1Data={data}
                tier2Data={tier2Data}
                tier2Loading={tier2Loading}
                userRole={userRole}
                onRemove={handleRemoveWidget}
                onResize={handleWidgetResize}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
