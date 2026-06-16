"use client";

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
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";

export default function TestWidgetsPage() {
  // Mock data for widgets
  const mockQuickStats = {
    totalPosts: 156,
    scheduledCount: 12,
    publishedThisWeek: 8,
    failedCount: 2,
  };

  const mockRecentPosts = [
    {
      id: "1",
      title: "Test Post 1",
      status: "PUBLISHED",
      confidence: "HIGH",
      scheduledAt: null,
      publishedAt: new Date().toISOString(),
      platforms: [{ platform: "instagram", status: "published", error: null }],
    },
    {
      id: "2",
      title: "Test Post 2",
      status: "SCHEDULED",
      confidence: "MEDIUM",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      publishedAt: null,
      platforms: [{ platform: "facebook", status: "scheduled", error: null }],
    },
  ];

  const mockScheduledPosts = [
    {
      id: "1",
      title: "Upcoming Post",
      platforms: ["instagram", "facebook"],
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  const mockInsights = {
    topPost: {
      title: "Top Performing Post",
      platform: "instagram",
      engagementRate: 0.085,
      likes: 245,
      comments: 32,
      shares: 18,
    },
    trend: {
      direction: "up" as const,
      metric: "Engagement rate",
      value: "+12%",
      period: "this week",
    },
    recommendation: "Video content is performing well. Consider creating more behind-the-scenes content.",
  };

  const mockStreak = {
    currentStreak: 7,
    longestStreak: 14,
    consistencyScore: 85,
    lastPostDate: new Date().toISOString(),
  };

  const mockProfile = {
    tone: "professional",
    postTypes: { image: 60, video: 30, text: 10 },
    audience: { "18-24": 30, "25-34": 45, "35-44": 25 },
    bio: { keywords: ["tech", "innovation", "design"] },
  };

  const mockChartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
    followers: 1000 + i * 50,
    engagementRate: 0.05 + Math.random() * 0.03,
    impressions: 5000 + i * 200,
    engagements: 250 + i * 10,
    clicks: 120 + i * 5,
    uniqueClicks: 80 + i * 3,
  }));

  const mockHeatmapData = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 9 }, (_, hour) => ({
      dayOfWeek: day,
      hour: hour + 9,
      avgEngagement: Math.random() * 0.1,
    }))
  ).flat();

  const mockSentiment = {
    positive: 65,
    neutral: 25,
    negative: 10,
  };

  const mockQueuedPosts = [
    {
      id: "1",
      title: "Draft Post",
      platforms: ["instagram"],
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      status: "draft" as const,
    },
    {
      id: "2",
      title: "Scheduled Post",
      platforms: ["facebook", "x"],
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      status: "scheduled" as const,
    },
  ];

  const mockFailureAlerts = [
    {
      id: "1",
      title: "Post Failed",
      description: "Failed to publish to Instagram",
      action: { label: "Retry", href: "/posts/1" },
    },
  ];

  const mockSuggestions = [
    {
      id: "1",
      title: "Behind the Scenes",
      description: "Show your workspace setup",
      platform: "instagram",
      confidence: "high" as const,
      estimatedEngagement: 0.085,
    },
  ];

  const mockInboxMessages = [
    {
      id: "1",
      platform: "instagram",
      type: "comment" as const,
      content: "Great post!",
      author: "user123",
      timestamp: new Date().toISOString(),
      isRead: false,
    },
  ];

  const mockAnomalyAlerts = [
    {
      id: "1",
      severity: "warning" as const,
      title: "Unusual Activity",
      description: "Engagement dropped by 40%",
      metric: "engagement_rate",
      change: -0.4,
    },
  ];

  const mockCompetitors = [
    { name: "Competitor A", followers: 5000, engagementRate: 0.065, postsPerWeek: 5 },
    { name: "Competitor B", followers: 3500, engagementRate: 0.078, postsPerWeek: 7 },
  ];

  const mockYourData = {
    name: "You",
    followers: 4200,
    engagementRate: 0.072,
    postsPerWeek: 6,
  };

  const mockWorkspaceUsage = {
    teamMembers: { used: 3, limit: 5 },
    storage: { used: 2048, limit: 5120 },
    posts: { used: 156, limit: 1000 },
    media: { used: 1536, limit: 10240 },
  };

  const mockServices = [
    { name: "API", status: "operational" as const, uptime: 99.9, lastChecked: new Date().toISOString() },
    { name: "Scheduler", status: "operational" as const, uptime: 99.8, lastChecked: new Date().toISOString() },
    { name: "Analytics", status: "degraded" as const, uptime: 95.5, lastChecked: new Date().toISOString() },
  ];

  const mockTrendingPosts: any[] = [];

  // Helper to render widget at different sizes
  const renderSizeVariants = (
    widgetName: string,
    sizes: WidgetSizeToken[],
    renderWidget: (size: WidgetSizeToken) => React.ReactNode
  ) => (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{widgetName}</h2>
      <div className="grid grid-cols-4 gap-4">
        {sizes.map((size) => (
          <div key={size} className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Size: {size}</div>
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              {renderWidget(size)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="p-8 space-y-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Widget Responsiveness Test</h1>
        <p className="text-muted-foreground">
          Testing all 18 dashboard widgets at various sizes to verify responsive behavior
        </p>
      </div>

      {/* 1. Quick Stats */}
      {renderSizeVariants("Quick Stats", ["10x1", "10x2"], (size) => (
        <QuickStatsWidget stats={mockQuickStats} size={size} />
      ))}

      {/* 2. Recent Posts */}
      {renderSizeVariants("Recent Posts", ["5x3", "5x4", "10x2", "10x3"], (size) => (
        <RecentPostsList posts={mockRecentPosts} size={size} />
      ))}

      {/* 3. AI Insights */}
      {renderSizeVariants("AI Insights", ["5x2", "5x3", "5x4", "10x2", "10x3"], (size) => (
        <InsightsCard topPost={mockInsights.topPost} trend={mockInsights.trend} recommendation={mockInsights.recommendation} size={size} />
      ))}

      {/* 4. Calendar Preview */}
      {renderSizeVariants("Calendar Preview", ["5x2", "5x3", "5x4", "10x2", "10x3"], (size) => (
        <CalendarPreview posts={mockScheduledPosts} size={size} />
      ))}

      {/* 5. Trending Radar */}
      {renderSizeVariants("Trending Radar", ["5x3", "5x4", "10x3"], (size) => (
        <TrendingRadarCard posts={mockTrendingPosts} size={size as any} />
      ))}

      {/* 6. Posting Streak */}
      {renderSizeVariants("Posting Streak", ["2x1", "2x2", "5x2"], (size) => (
        <PostingStreakWidget streak={mockStreak} size={size} />
      ))}

      {/* 10. Profile Analysis */}
      {renderSizeVariants("Profile Analysis", ["10x2", "10x3", "10x4"], (size) => (
        <ProfileAnalysisCard profile={mockProfile} size={size} />
      ))}

      {/* 11. Follower Growth */}
      {renderSizeVariants("Follower Growth", ["2x1", "2x2", "5x2", "5x3", "10x2"], (size) => (
        <FollowerGrowthWidget data={mockChartData} size={size} />
      ))}

      {/* 7. Best Time to Post */}
      {renderSizeVariants("Best Time to Post", ["5x3", "10x2", "10x3"], (size) => (
        <BestTimeToPostWidget data={mockHeatmapData} size={size} />
      ))}

      {/* 8. Sentiment Analysis */}
      {renderSizeVariants("Sentiment Analysis", ["5x3", "10x2", "10x3"], (size) => (
        <SentimentAnalysisWidget data={mockSentiment} size={size} />
      ))}

      {/* 16. Content Queue */}
      {renderSizeVariants("Content Queue", ["5x2", "5x3", "5x4", "10x2", "10x3"], (size) => (
        <ContentQueueWidget posts={mockQueuedPosts} size={size} />
      ))}

      {/* 9. Failure Alerts */}
      {renderSizeVariants("Failure Alerts", ["10x1", "10x2"], (size) => (
        <FailureAlertWidget alerts={mockFailureAlerts} size={size} />
      ))}

      {/* 10. AI Content Suggestions */}
      {renderSizeVariants("AI Content Suggestions", ["5x2", "5x3", "10x2", "10x3"], (size) => (
        <AIContentSuggestionsWidget suggestions={mockSuggestions} size={size} />
      ))}

      {/* 11. Unified Inbox */}
      {renderSizeVariants("Unified Inbox", ["5x2", "5x3", "10x1", "10x2", "5x4", "10x3"], (size) => (
        <UnifiedInboxWidget messages={mockInboxMessages} unreadCount={1} size={size} />
      ))}

      {/* 24. Anomaly Alerts */}
      {renderSizeVariants("Anomaly Alerts", ["10x1", "10x2"], (size) => (
        <AnomalyAlertsWidget alerts={mockAnomalyAlerts} size={size} />
      ))}

      {/* 25. Competitor Benchmark */}
      {renderSizeVariants("Competitor Benchmark", ["5x3", "10x2", "10x3", "10x4"], (size) => (
        <CompetitorBenchmarkWidget competitors={mockCompetitors} yourData={mockYourData} size={size} />
      ))}

      {/* 12. Workspace Usage */}
      {renderSizeVariants("Workspace Usage", ["5x2", "5x3", "10x2", "10x3"], (size) => (
        <WorkspaceUsageWidget usage={mockWorkspaceUsage} size={size} />
      ))}

      {/* 13. System Health */}
      {renderSizeVariants("System Health", ["10x1", "10x2", "10x3", "10x4"], (size) => (
        <SystemHealthWidget services={mockServices} overallStatus="operational" size={size} />
      ))}
    </div>
  );
}
