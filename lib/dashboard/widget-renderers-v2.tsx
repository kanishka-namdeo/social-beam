import type { WidgetMetadata } from "./widget-registry";
import { WIDGET_COMPONENTS, getWidgetProps } from "./widget-component-registry";

/**
 * Widget renderers v2 — maps widget IDs to their React component imports.
 * This is the registry that the dashboard grid uses to dynamically render widgets.
 */

export interface WidgetRendererConfig {
  id: string;
  componentPath: string;
  requiresDataFetch?: boolean;
  dataEndpoint?: string;
}

export const WIDGET_RENDERERS: WidgetRendererConfig[] = [
  {
    id: "quick-stats",
    componentPath: "@/components/dashboard/quick-stats-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/quick-stats",
  },
  {
    id: "recent-posts",
    componentPath: "@/components/dashboard/recent-posts-list",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/recent-posts",
  },
  {
    id: "insights",
    componentPath: "@/components/dashboard/insights-card",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/insights",
  },
  {
    id: "calendar-preview",
    componentPath: "@/components/dashboard/calendar-preview",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/calendar-preview",
  },
  {
    id: "trending-radar",
    componentPath: "@/components/reddit/trending-radar-card",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/trending-radar",
  },
  {
    id: "posting-streak",
    componentPath: "@/components/dashboard/posting-streak-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/posting-streak",
  },
  {
    id: "profile-analysis",
    componentPath: "@/components/dashboard/profile-analysis-card",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/profile-analysis",
  },
  {
    id: "follower-growth",
    componentPath: "@/components/dashboard/follower-growth-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/follower-growth",
  },
  {
    id: "best-time-to-post",
    componentPath: "@/components/dashboard/best-time-to-post-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/best-time-to-post",
  },
  {
    id: "sentiment-analysis",
    componentPath: "@/components/dashboard/sentiment-analysis-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/sentiment-analysis",
  },
  {
    id: "content-queue",
    componentPath: "@/components/dashboard/content-queue-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/content-queue",
  },
  {
    id: "failure-alert",
    componentPath: "@/components/dashboard/failure-alert-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/failure-alert",
  },
  {
    id: "ai-content-suggestions",
    componentPath: "@/components/dashboard/ai-content-suggestions-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/ai-content-suggestions",
  },
  {
    id: "unified-inbox",
    componentPath: "@/components/dashboard/unified-inbox-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/unified-inbox",
  },
  {
    id: "anomaly-alerts",
    componentPath: "@/components/dashboard/anomaly-alerts-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/anomaly-alerts",
  },
  {
    id: "competitor-benchmark",
    componentPath: "@/components/dashboard/competitor-benchmark-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/competitor-benchmark",
  },
  {
    id: "workspace-usage",
    componentPath: "@/components/dashboard/workspace-usage-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/workspace-usage",
  },
  {
    id: "system-health",
    componentPath: "@/components/dashboard/system-health-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/dashboard/widgets/system-health",
  },
  {
    id: "active-campaigns",
    componentPath: "@/components/dashboard/active-campaigns-widget",
    requiresDataFetch: true,
    dataEndpoint: "/api/campaigns?status=ACTIVE&limit=3",
  },
];

export function getWidgetRenderer(widgetId: string): WidgetRendererConfig | undefined {
  return WIDGET_RENDERERS.find((w) => w.id === widgetId);
}

export function getAllWidgetRenderers(): WidgetRendererConfig[] {
  return WIDGET_RENDERERS;
}

/**
 * Render a widget component by its ID.
 * Used by the widget grid to render widgets at runtime.
 * Delegates to widget-component-registry for component lookup and prop mapping.
 */
export function renderWidgetContent(
  widgetId: string,
  size: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tier1Data: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tier2Data: any,
  tier2Loading: boolean,
  userRole: string,
): React.ReactNode {
  const WidgetComponent = WIDGET_COMPONENTS[widgetId];
  if (!WidgetComponent) {
    return null;
  }

  const props = getWidgetProps(widgetId, size, tier1Data, tier2Data, tier2Loading);
  return <WidgetComponent {...props} />;
}
