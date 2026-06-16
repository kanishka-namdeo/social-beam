import { QuickStatsWidget } from "@/components/dashboard/quick-stats-widget";
import { RecentPostsList } from "@/components/dashboard/recent-posts-list";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { CalendarPreview } from "@/components/dashboard/calendar-preview";
import { TrendingRadarCard } from "@/components/reddit/trending-radar-card";
import { PostingStreakWidget } from "@/components/dashboard/posting-streak-widget";
import { ProfileAnalysisCard } from "@/components/dashboard/profile-analysis-card";
import { FollowerGrowthWidget } from "@/components/dashboard/follower-growth-widget";
import { BestTimeToPostWidget } from "@/components/dashboard/best-time-to-post-widget";
import { SentimentAnalysisWidget } from "@/components/dashboard/sentiment-analysis-widget";
import { ContentQueueWidget } from "@/components/dashboard/content-queue-widget";
import { FailureAlertWidget } from "@/components/dashboard/failure-alert-widget";
import { AIContentSuggestionsWidget } from "@/components/dashboard/ai-content-suggestions-widget";
import { UnifiedInboxWidget } from "@/components/dashboard/unified-inbox-widget";
import { AnomalyAlertsWidget } from "@/components/dashboard/anomaly-alerts-widget";
import { CompetitorBenchmarkWidget } from "@/components/dashboard/competitor-benchmark-widget";
import { WorkspaceUsageWidget } from "@/components/dashboard/workspace-usage-widget";
import { SystemHealthWidget } from "@/components/dashboard/system-health-widget";
import { ActiveCampaignsWidget } from "@/components/dashboard/active-campaigns-widget";

export const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "quick-stats": QuickStatsWidget,
  "recent-posts": RecentPostsList,
  insights: InsightsCard,
  "calendar-preview": CalendarPreview,
  "trending-radar": TrendingRadarCard,
  "posting-streak": PostingStreakWidget,
  "profile-analysis": ProfileAnalysisCard,
  "follower-growth": FollowerGrowthWidget,
  "best-time-to-post": BestTimeToPostWidget,
  "sentiment-analysis": SentimentAnalysisWidget,
  "content-queue": ContentQueueWidget,
  "failure-alert": FailureAlertWidget,
  "ai-content-suggestions": AIContentSuggestionsWidget,
  "unified-inbox": UnifiedInboxWidget,
  "anomaly-alerts": AnomalyAlertsWidget,
  "competitor-benchmark": CompetitorBenchmarkWidget,
  "workspace-usage": WorkspaceUsageWidget,
  "system-health": SystemHealthWidget,
  "active-campaigns": ActiveCampaignsWidget,
};

/** Widgets rendered directly without Suspense wrapper */
export const TIER1_WIDGET_IDS = new Set([
  "quick-stats",
  "recent-posts",
  "insights",
  "calendar-preview",
]);

/** Tier 2 widgets that render directly (no Suspense) */
export const NO_SUSPENSE_WIDGET_IDS = new Set([
  "content-queue",
  "failure-alert",
  "unified-inbox",
]);

export function getWidgetProps(
  widgetId: string,
  size: string,
  tier1Data: any,
  tier2Data: any,
  tier2Loading: boolean,
): Record<string, any> {
  switch (widgetId) {
    // --- Tier 1: data from tier1Data ---
    case "quick-stats":
      return { stats: tier1Data.quickStats, size };
    case "recent-posts":
      return { posts: tier1Data.recentPosts, size };
    case "insights":
      return {
        topPost: tier1Data.insights.topPost,
        trend: tier1Data.insights.trend,
        recommendation: tier1Data.insights.recommendation,
        size,
      };
    case "calendar-preview":
      return { posts: tier1Data.scheduledPosts, size };

    // --- Tier 2: data from tier2Data ---
    case "trending-radar":
      return tier2Loading
        ? { posts: [], isLoading: true, size }
        : { posts: tier2Data?.trending?.posts ?? [], size };
    case "posting-streak":
      return {
        streak: tier2Data?.streak ?? { currentStreak: 0, longestStreak: 0, consistencyScore: 0, lastPostDate: null },
        isLoading: tier2Loading,
        size,
      };
    case "profile-analysis":
      return { profile: tier2Data?.profile ?? {}, size };
    case "follower-growth":
      return { data: tier2Data?.followerGrowth?.data ?? [], isLoading: tier2Loading, size };
    case "best-time-to-post":
      return { data: tier2Data?.bestTimeToPost?.data ?? [], isLoading: tier2Loading, size };
    case "sentiment-analysis":
      return {
        data: tier2Data?.sentiment?.data ?? { positive: 0, neutral: 0, negative: 0 },
        isLoading: tier2Loading,
        size,
      };
    case "content-queue":
      return { posts: tier2Data?.contentQueue?.posts ?? [], size };
    case "failure-alert":
      return { alerts: tier2Data?.failureAlerts ?? [], size };
    case "ai-content-suggestions":
      return { suggestions: tier2Data?.aiContentSuggestions ?? [], isLoading: tier2Loading, size };
    case "unified-inbox":
      return {
        messages: tier2Data?.unifiedInbox?.messages ?? [],
        unreadCount: tier2Data?.unifiedInbox?.unreadCount ?? 0,
        size,
      };
    case "anomaly-alerts":
      return { alerts: tier2Data?.anomalyAlerts ?? [], size };
    case "competitor-benchmark":
      return {
        competitors: tier2Data?.competitorBenchmark?.competitors ?? [],
        yourData: tier2Data?.competitorBenchmark?.yourData ?? { name: "You", followers: 0, engagementRate: 0, postsPerWeek: 0 },
        isLoading: tier2Loading,
        size,
      };
    case "workspace-usage":
      return {
        usage: tier2Data?.workspaceUsage ?? { teamMembers: { used: 0, limit: 10 }, storage: { used: 0, limit: 1024 }, posts: { used: 0, limit: 100 }, media: { used: 0, limit: 512 } },
        isLoading: tier2Loading,
        size,
      };
    case "system-health":
      return {
        services: tier2Data?.systemHealth?.services ?? [],
        overallStatus: tier2Data?.systemHealth?.overallStatus ?? "operational",
        isLoading: tier2Loading,
        size,
      };
    default:
      return { size };
  }
}
