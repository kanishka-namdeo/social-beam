"use client";

import { useState } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { WidgetLayout, WidgetLayoutEntry } from "@/lib/dashboard/widget-registry";
import { getWidgetMeta, normalizeLayout } from "@/lib/dashboard/widget-registry";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { Badge } from "@/components/ui/badge";
import { RecentPostsList } from "@/components/dashboard/recent-posts-list";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { CalendarPreview } from "@/components/dashboard/calendar-preview";
import { TrendingRadarCard } from "@/components/reddit/trending-radar-card";
import { ProfileAnalysisCard } from "@/components/dashboard/profile-analysis-card";
import { QuickStatsWidget } from "@/components/dashboard/quick-stats-widget";
import { EngagementSparklineWidget } from "@/components/dashboard/engagement-sparkline-widget";
import { PostingStreakWidget } from "@/components/dashboard/posting-streak-widget";
import { ConnectedAccountsWidget } from "@/components/dashboard/connected-accounts-widget";

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
  trendingPosts: Array<{
    id: string;
    subreddit: string;
    title: string;
    url: string;
    author: string;
    upvotes: number;
    commentCount: number;
    relevanceScore: number | null;
    relevanceReason: string | null;
    isActionable: boolean;
    topicTags: string[];
    suggestedAction: string | null;
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
  profile: {
    tone?: string | null;
    postTypes?: Record<string, unknown> | null;
    audience?: Record<string, unknown> | null;
    bio?: Record<string, unknown> | null;
  };
  connectedAccounts: Array<{
    id: string;
    platform: string;
    platformUserId: string;
    status: string;
  }>;
  quickStats: {
    totalPosts: number;
    scheduledCount: number;
    publishedThisWeek: number;
    failedCount: number;
  };
  engagementData: Array<{ date: string; engagementRate: number }>;
  postingStreak: {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
    lastPostDate: string | null;
  };
}

interface WidgetGridProps {
  layout: WidgetLayout;
  data: DashboardData;
}

export function WidgetGrid({ layout, data }: WidgetGridProps) {
  const normalizedLayout = normalizeLayout(layout);
  const [widgets, setWidgets] = useState<WidgetLayoutEntry[]>(normalizedLayout.widgets);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const savePreferences = async (updatedWidgets: WidgetLayoutEntry[]) => {
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
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      savePreferences(reordered);
      return reordered;
    });
  };

  const handleResize = (widgetId: string, colSpan: 1 | 2 | 4) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => (w.id === widgetId ? { ...w, colSpan } : w));
      savePreferences(updated);
      return updated;
    });
  };

  const handleHide = (widgetId: string) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => (w.id === widgetId ? { ...w, visible: false } : w));
      savePreferences(updated);
      return updated;
    });
  };

  const visibleWidgets = widgets.filter((w) => w.visible);

  const renderWidgetContent = (entry: WidgetLayoutEntry) => {
    switch (entry.id) {
      case "recent-posts":
        return <RecentPostsList posts={data.recentPosts} />;
      case "insights":
        return (
          <InsightsCard
            topPost={data.insights.topPost}
            trend={data.insights.trend}
            recommendation={data.insights.recommendation}
          />
        );
      case "calendar-preview":
        return <CalendarPreview posts={data.scheduledPosts} />;
      case "trending-radar":
        return <TrendingRadarCard posts={data.trendingPosts} />;
      case "profile-analysis":
        return <ProfileAnalysisCard profile={data.profile} />;
      case "quick-stats":
        return <QuickStatsWidget stats={data.quickStats} />;
      case "engagement-sparkline":
        return <EngagementSparklineWidget data={data.engagementData} />;
      case "posting-streak":
        return <PostingStreakWidget streak={data.postingStreak} />;
      case "connected-accounts":
        return <ConnectedAccountsWidget accounts={data.connectedAccounts} />;
      default: {
        const meta = getWidgetMeta(entry.id);
        return (
          <div className="flex items-center justify-between rounded-sm border border-border bg-card p-6">
            <div>
              <p className="text-sm font-medium text-foreground">{meta?.name ?? entry.id}</p>
              <p className="text-xs text-muted-foreground">Widget coming soon</p>
            </div>
            <Badge variant="secondary" className="rounded-sm">
              Building...
            </Badge>
          </div>
        );
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleWidgets.map((entry) => {
            const meta = getWidgetMeta(entry.id);
            return (
              <WidgetCard
                key={entry.id}
                id={entry.id}
                colSpan={entry.colSpan}
                onResize={(colSpan) => handleResize(entry.id, colSpan)}
                onHide={() => handleHide(entry.id)}
              >
                {renderWidgetContent(entry)}
              </WidgetCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
