import type { LayoutItem } from "react-grid-layout";

export interface WidgetSizeVariant {
  token: string;
  w: number;
  h: number;
  description: string;
}

// WidgetLayoutEntry is already compatible with LayoutItem
export type WidgetLayoutItem = LayoutItem & {
  size: string;      // keep for backward compat with customize dialog
  visible: boolean;
};

export interface WidgetMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "analytics" | "content" | "ai" | "operational" | "social" | "admin";
  sizes: WidgetSizeVariant[];
  defaultSize: string;
  defaultPosition: { x: number; y: number };
  minRole: "FREE_USER" | "PREMIUM_USER" | "ADMIN";
  isUpsell?: boolean;
  defaultColSpan?: number;
  defaultRowSpan?: number;
}

export interface WidgetLayoutEntry {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: string;
  visible: boolean;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
}

export interface WidgetLayout {
  widgets: WidgetLayoutEntry[];
}

export const SIZE_MAP: Record<string, WidgetSizeVariant> = {};

// Populate dynamically for all possible tokens (cols 1-10, rows 1-4)
for (const cols of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  for (const rows of [1, 2, 3, 4]) {
    const token = `${cols}x${rows}`;
    SIZE_MAP[token] = {
      token,
      w: cols,
      h: rows,
      description: `${cols === 10 ? 'Full-width' : cols >= 7 ? 'Wide' : cols >= 4 ? 'Standard' : 'Narrow'} ${cols}-col, ${rows}-row`,
    };
  }
}

export const CATEGORY_LIMITS: Record<string, number | null> = {
  analytics: 3,
  content: null,
  ai: 3,
  operational: null,
  social: null,
  admin: null,
};

export const WIDGET_LIMITS = {
  FREE_USER: { softMax: 8, hardMax: 10 },
  PREMIUM_USER: { softMax: 12, hardMax: 15 },
  ADMIN: { softMax: 12, hardMax: 15 },
};

export const WIDGET_REGISTRY: WidgetMetadata[] = [
  // === EXISTING WIDGETS (1-10) ===

  {
    id: "quick-stats",
    name: "Quick Stats",
    description: "Key metrics at a glance with sparklines",
    icon: "ChartBar",
    category: "analytics",
    sizes: [SIZE_MAP["10x1"], SIZE_MAP["10x2"]],
    defaultSize: "10x1",
    defaultPosition: { x: 0, y: 0 },
    minRole: "FREE_USER",
  },
  {
    id: "recent-posts",
    name: "Recent Posts",
    description: "Latest published posts with engagement data",
    icon: "FileText",
    category: "content",
    sizes: [SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 0, y: 1 },
    minRole: "FREE_USER",
  },
  {
    id: "insights",
    name: "AI Insights",
    description: "AI-powered recommendations and trend analysis",
    icon: "Lightbulb",
    category: "ai",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 5, y: 0 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  {
    id: "calendar-preview",
    name: "Calendar Preview",
    description: "Upcoming scheduled posts at a glance",
    icon: "Calendar",
    category: "operational",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 5, y: 3 },
    minRole: "FREE_USER",
  },
  {
    id: "trending-radar",
    name: "Trending Radar",
    description: "Trending topics and posts in your niche",
    icon: "Radar",
    category: "analytics",
    sizes: [SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 0, y: 5 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  {
    id: "posting-streak",
    name: "Posting Streak",
    description: "Current streak and consistency tracking",
    icon: "Fire",
    category: "operational",
    sizes: [SIZE_MAP["2x1"], SIZE_MAP["2x2"], SIZE_MAP["5x2"]],
    defaultSize: "2x2",
    defaultPosition: { x: 0, y: 4 },
    minRole: "FREE_USER",
  },
  {
    id: "profile-analysis",
    name: "Profile Analysis",
    description: "AI-powered brand profile breakdown",
    icon: "UserCircle",
    category: "ai",
    sizes: [SIZE_MAP["10x2"], SIZE_MAP["10x3"], SIZE_MAP["10x4"]],
    defaultSize: "10x2",
    defaultPosition: { x: 0, y: 8 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },

  // === NEW ANALYTICS WIDGETS (11-15) ===

  {
    id: "follower-growth",
    name: "Follower Growth",
    description: "Track follower counts across platforms with trend lines",
    icon: "Users",
    category: "analytics",
    sizes: [SIZE_MAP["2x1"], SIZE_MAP["2x2"], SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["10x2"]],
    defaultSize: "5x2",
    defaultPosition: { x: 0, y: 10 },
    minRole: "FREE_USER",
  },
  {
    id: "best-time-to-post",
    name: "Best Time to Post",
    description: "Heatmap showing optimal posting times by day and hour",
    icon: "Clock",
    category: "analytics",
    sizes: [SIZE_MAP["5x3"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 5, y: 6 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  {
    id: "sentiment-analysis",
    name: "Sentiment Analysis",
    description: "Audience sentiment breakdown with word cloud",
    icon: "Smiley",
    category: "analytics",
    sizes: [SIZE_MAP["5x3"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 0, y: 12 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },

  // === NEW CONTENT WIDGETS (16-18) ===

  {
    id: "content-queue",
    name: "Content Queue",
    description: "Drafts and scheduled posts waiting to be published",
    icon: "ArrowClockwise",
    category: "content",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x2",
    defaultPosition: { x: 2, y: 12 },
    minRole: "FREE_USER",
  },
  {
    id: "active-campaigns",
    name: "Active Campaigns",
    description: "Monitor ongoing campaigns with progress tracking",
    icon: "Megaphone",
    category: "content",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["10x2"]],
    defaultSize: "5x2",
    defaultPosition: { x: 5, y: 12 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  {
    id: "failure-alert",
    name: "Failure Alerts",
    description: "Failed posts with retry options and error details",
    icon: "WarningCircle",
    category: "content",
    sizes: [SIZE_MAP["10x1"], SIZE_MAP["10x2"]],
    defaultSize: "10x1",
    defaultPosition: { x: 0, y: 14 },
    minRole: "FREE_USER",
  },
  {
    id: "active-campaigns",
    name: "Active Campaigns",
    description: "Track active campaigns and their progress at a glance",
    icon: "Megaphone",
    category: "content",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["5x4"], SIZE_MAP["10x2"]],
    defaultSize: "5x2",
    defaultPosition: { x: 5, y: 8 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },

  // === NEW AI WIDGETS (19-22) ===

  {
    id: "ai-content-suggestions",
    name: "AI Content Suggestions",
    description: "AI-generated post ideas tailored to your audience",
    icon: "Lightbulb",
    category: "ai",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 5, y: 10 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  // === NEW SOCIAL WIDGETS (23-26) ===

  {
    id: "unified-inbox",
    name: "Unified Inbox",
    description: "Messages and mentions from all platforms in one place",
    icon: "Chats",
    category: "social",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["10x1"], SIZE_MAP["10x2"], SIZE_MAP["5x4"], SIZE_MAP["10x3"]],
    defaultSize: "5x2",
    defaultPosition: { x: 5, y: 12 },
    minRole: "FREE_USER",
  },
  {
    id: "anomaly-alerts",
    name: "Anomaly Alerts",
    description: "Unusual activity detected across your accounts",
    icon: "Warning",
    category: "social",
    sizes: [SIZE_MAP["10x1"], SIZE_MAP["10x2"]],
    defaultSize: "10x1",
    defaultPosition: { x: 0, y: 18 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  {
    id: "competitor-benchmark",
    name: "Competitor Benchmark",
    description: "Compare your metrics against competitor accounts",
    icon: "Scales",
    category: "social",
    sizes: [SIZE_MAP["5x3"], SIZE_MAP["10x2"], SIZE_MAP["10x3"], SIZE_MAP["10x4"]],
    defaultSize: "5x3",
    defaultPosition: { x: 5, y: 14 },
    minRole: "PREMIUM_USER",
    isUpsell: true,
  },
  // === ADMIN WIDGETS (27-28) ===

  {
    id: "workspace-usage",
    name: "Workspace Usage",
    description: "Team activity and resource utilization metrics",
    icon: "Monitor",
    category: "admin",
    sizes: [SIZE_MAP["5x2"], SIZE_MAP["5x3"], SIZE_MAP["10x2"], SIZE_MAP["10x3"]],
    defaultSize: "5x3",
    defaultPosition: { x: 0, y: 20 },
    minRole: "ADMIN",
  },
  {
    id: "system-health",
    name: "System Health",
    description: "Task status, error logs, and service health overview",
    icon: "Activity",
    category: "admin",
    sizes: [SIZE_MAP["10x1"], SIZE_MAP["10x2"], SIZE_MAP["10x3"], SIZE_MAP["10x4"]],
    defaultSize: "10x2",
    defaultPosition: { x: 0, y: 22 },
    minRole: "ADMIN",
  },
];

// === HELPER FUNCTIONS ===

export function sizeToGrid(sizeToken: string | undefined): {
  w: number;
  h: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
} {
  const defaultResult = { w: 5, h: 2, minW: 3, maxW: 10, minH: 1, maxH: 4 };

  if (!sizeToken) {
    return defaultResult;
  }

  const entry = SIZE_MAP[sizeToken];
  if (!entry) {
    return defaultResult;
  }

  // Derive min/max constraints from size token
  // minW: minimum width is 2 units less than current, but at least 1 column
  // maxW: maximum width is 2 units more than current, but at most 10 columns
  const minW = Math.max(1, entry.w - 2);
  const maxW = Math.min(10, entry.w + 2);
  const minH = Math.max(1, entry.h - 1);
  const maxH = Math.min(4, entry.h + 2);

  return {
    w: entry.w,
    h: entry.h,
    minW,
    maxW,
    minH,
    maxH,
  };
}

export function findNearestAllowedSize(
  dims: { w: number; h: number },
  widgetId: string
): WidgetSizeVariant | undefined {
  const meta = getWidgetMeta(widgetId);
  if (!meta || meta.sizes.length === 0) return undefined;

  let best: WidgetSizeVariant | undefined;
  let bestDist = Infinity;
  let bestArea = -1;

  for (const size of meta.sizes) {
    const dist = Math.abs(size.w - dims.w) + Math.abs(size.h - dims.h);
    const area = size.w * size.h;
    if (dist < bestDist || (dist === bestDist && area > bestArea)) {
      best = size;
      bestDist = dist;
      bestArea = area;
    }
  }

  return best;
}

export function getSizeConstraints(widgetId: string): {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
} {
  const meta = getWidgetMeta(widgetId);
  if (!meta || meta.sizes.length === 0) {
    return { minW: 2, maxW: 10, minH: 1, maxH: 4 };
  }

  let minW = Infinity;
  let maxW = -Infinity;
  let minH = Infinity;
  let maxH = -Infinity;

  for (const size of meta.sizes) {
    if (size.w < minW) minW = size.w;
    if (size.w > maxW) maxW = size.w;
    if (size.h < minH) minH = size.h;
    if (size.h > maxH) maxH = size.h;
  }

  return { minW, maxW, minH, maxH };
}

export function isValidSize(widgetId: string, sizeToken: string): boolean {
  const widget = WIDGET_REGISTRY.find((w) => w.id === widgetId);
  if (!widget) return false;
  return widget.sizes.some((s) => s.token === sizeToken);
}

export function getWidgetMeta(id: string): WidgetMetadata | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

export function getAllowedSizes(widgetId: string): WidgetSizeVariant[] {
  const meta = getWidgetMeta(widgetId);
  return meta?.sizes ?? [];
}

export function getWidgetsForRole(role: string): WidgetMetadata[] {
  const roleHierarchy = { FREE_USER: 0, PREMIUM_USER: 1, ADMIN: 2 } as const;
  const roleLevel = roleHierarchy[role as keyof typeof roleHierarchy] ?? 0;
  return WIDGET_REGISTRY.filter((w) => {
    const widgetLevel = roleHierarchy[w.minRole] ?? 0;
    return widgetLevel <= roleLevel;
  });
}

export function validateWidgetCount(count: number, role: string): { valid: boolean; warning?: string; blocked?: string } {
  const limits = WIDGET_LIMITS[role as keyof typeof WIDGET_LIMITS] ?? WIDGET_LIMITS.FREE_USER;
  if (count > limits.hardMax) {
    return { valid: false, blocked: `Maximum ${limits.hardMax} widgets allowed` };
  }
  if (count > limits.softMax) {
    return { valid: true, warning: "Dashboard may become hard to scan" };
  }
  return { valid: true };
}

export const WIDGET_CATEGORIES = ["analytics", "content", "ai", "operational", "social", "admin"] as const;

const ROLE_DEFAULT_WIDGETS: Record<string, string[]> = {
  // 8 widgets -- stays within softMax of 8
  // analytics: 2 (limit 3), content: 3, operational: 2, social: 1
  FREE_USER: [
    "quick-stats",       // analytics
    "recent-posts",      // content
    "calendar-preview",  // operational
    "posting-streak",    // operational
    "follower-growth",   // analytics
    "content-queue",     // content
    "failure-alert",     // content
    "unified-inbox",     // social
  ],
  // 12 widgets -- stays within softMax of 12
  // analytics: 3 (limit 3), ai: 3 (limit 3), content: 3, operational: 2, social: 1
  PREMIUM_USER: [
    "quick-stats",            // analytics
    "recent-posts",           // content
    "calendar-preview",       // operational
    "posting-streak",         // operational
    "follower-growth",        // analytics
    "content-queue",          // content
    "failure-alert",          // content
    "unified-inbox",          // social
    "insights",               // ai
    "best-time-to-post",      // analytics
    "profile-analysis",       // ai
    "ai-content-suggestions", // ai
  ],
  // 12 widgets -- stays within softMax of 12
  // analytics: 3, ai: 1, content: 3, operational: 2, social: 1, admin: 2
  ADMIN: [
    "quick-stats",           // analytics
    "recent-posts",          // content
    "calendar-preview",      // operational
    "posting-streak",        // operational
    "follower-growth",       // analytics
    "content-queue",         // content
    "failure-alert",         // content
    "unified-inbox",         // social
    "insights",              // ai
    "best-time-to-post",     // analytics
    "workspace-usage",       // admin
    "system-health",         // admin
  ],
};

export function getDefaultLayoutForRole(role: string): WidgetLayout {
  const widgetIds = ROLE_DEFAULT_WIDGETS[role] ?? ROLE_DEFAULT_WIDGETS.FREE_USER;
  const visibleWidgets = WIDGET_REGISTRY.filter((w) => widgetIds.includes(w.id));

  return {
    widgets: visibleWidgets.map((w) => {
      const grid = sizeToGrid(w.defaultSize);
      const constraints = getSizeConstraints(w.id);
      return {
        i: w.id,
        x: w.defaultPosition.x,
        y: w.defaultPosition.y,
        w: grid.w,
        h: grid.h,
        size: w.defaultSize,
        visible: true,
        minW: constraints.minW,
        maxW: constraints.maxW,
        minH: constraints.minH,
        maxH: constraints.maxH,
      };
    }),
  };
}

// Backwards-compatible aliases
export const DEFAULT_WIDGET_LAYOUT = getDefaultLayoutForRole("FREE_USER");
export const DEFAULT_WIDGET_LAYOUT_FREE = getDefaultLayoutForRole("FREE_USER");
export const DEFAULT_WIDGET_LAYOUT_PREMIUM = getDefaultLayoutForRole("PREMIUM_USER");
export const DEFAULT_WIDGET_LAYOUT_ADMIN = getDefaultLayoutForRole("ADMIN");
