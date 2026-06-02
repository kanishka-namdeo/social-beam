// Widget registry — single source of truth for dashboard widgets

export interface WidgetMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultColSpan: 1 | 2 | 4;
  defaultVisible: boolean;
}

export interface WidgetLayoutEntry {
  id: string;
  visible: boolean;
  colSpan: 1 | 2 | 4;
}

export interface WidgetLayout {
  widgets: WidgetLayoutEntry[];
}

function clampColSpan(span: number): 1 | 2 | 4 {
  if (span <= 1) return 1;
  if (span <= 2) return 2;
  return 4;
}

export const DEFAULT_WIDGET_LAYOUT: WidgetLayout = {
  widgets: [
    { id: "quick-stats", visible: true, colSpan: 4 },
    { id: "recent-posts", visible: true, colSpan: 2 },
    { id: "insights", visible: true, colSpan: 2 },
    { id: "calendar-preview", visible: true, colSpan: 2 },
    { id: "trending-radar", visible: true, colSpan: 2 },
    { id: "engagement-sparkline", visible: true, colSpan: 2 },
    { id: "posting-streak", visible: true, colSpan: 2 },
    { id: "profile-analysis", visible: true, colSpan: 4 },
    { id: "connected-accounts", visible: true, colSpan: 4 },
  ],
};

export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  "quick-stats": {
    id: "quick-stats",
    name: "Quick Stats",
    description: "Total posts, scheduled, published, and failed counts",
    icon: "chart-bar",
    defaultColSpan: 4,
    defaultVisible: true,
  },
  "recent-posts": {
    id: "recent-posts",
    name: "Recent Posts",
    description: "Last 5 posts with status badges and platform indicators",
    icon: "list-dashes",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "insights": {
    id: "insights",
    name: "Insights",
    description: "Top-performing post and AI recommendations",
    icon: "sparkle",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "calendar-preview": {
    id: "calendar-preview",
    name: "Calendar Preview",
    description: "7-day upcoming posts preview",
    icon: "calendar",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "trending-radar": {
    id: "trending-radar",
    name: "Trending Radar",
    description: "Top trending Reddit posts from tracked subreddits",
    icon: "radar",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "engagement-sparkline": {
    id: "engagement-sparkline",
    name: "Engagement Trend",
    description: "14-day engagement sparkline chart",
    icon: "trend-up",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "posting-streak": {
    id: "posting-streak",
    name: "Posting Streak",
    description: "Current posting streak and consistency score",
    icon: "fire",
    defaultColSpan: 2,
    defaultVisible: true,
  },
  "profile-analysis": {
    id: "profile-analysis",
    name: "Profile Analysis",
    description: "Brand tone, content mix, and audience insights",
    icon: "user-circle",
    defaultColSpan: 4,
    defaultVisible: true,
  },
  "connected-accounts": {
    id: "connected-accounts",
    name: "Connected Accounts",
    description: "Connected social accounts with status badges",
    icon: "link",
    defaultColSpan: 4,
    defaultVisible: true,
  },
};

export function getWidgetMeta(id: string): WidgetMetadata | undefined {
  return WIDGET_REGISTRY[id];
}

export function getVisibleWidgets(layout: WidgetLayout): WidgetLayoutEntry[] {
  return layout.widgets.filter((w) => w.visible);
}

export function normalizeLayout(layout: WidgetLayout): WidgetLayout {
  const seenIds = new Set(layout.widgets.map((w) => w.id));

  const normalized: WidgetLayoutEntry[] = layout.widgets.map((w) => ({
    id: w.id,
    visible: w.visible,
    colSpan: clampColSpan(w.colSpan),
  }));

  for (const defaultWidget of DEFAULT_WIDGET_LAYOUT.widgets) {
    if (!seenIds.has(defaultWidget.id)) {
      normalized.push({
        id: defaultWidget.id,
        visible: defaultWidget.visible,
        colSpan: defaultWidget.colSpan,
      });
    }
  }

  return { widgets: normalized };
}
