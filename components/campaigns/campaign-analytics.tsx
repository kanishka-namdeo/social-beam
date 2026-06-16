"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Heart,
  ChatCircle,
  Share,
  CursorClick,
  ArrowsOut,
  Bookmark,
  VideoCamera,
  Globe,
  UserCircle,
  TrendUp,
} from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CampaignAnalyticsProps {
  campaignId: string;
}

interface TopPost {
  postId: string;
  title: string | null;
  status: string;
  impressions: number;
  engagement: number;
  engagementRate: number | null;
}

interface GoalProgress {
  impressionsPercent: number;
  engagementRatePercent: number;
}

interface AnalyticsData {
  totalImpressions: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  totalClicks: number;
  totalSaves: number;
  totalVideoViews: number;
  totalWebsiteClicks: number;
  totalProfileVisits: number;
  avgEngagementRate: number;
  postsPublished: number;
  postsScheduled: number;
  topPosts: TopPost[];
  goalProgress?: GoalProgress;
  targetImpressions?: number;
  targetEngagementRate?: number;
}

const METRICS: Array<{
  key: keyof AnalyticsData;
  label: string;
  icon: typeof Eye;
  iconColor: string;
}> = [
  { key: "totalImpressions", label: "Impressions", icon: Eye, iconColor: "text-blue-500" },
  { key: "totalReach", label: "Reach", icon: ArrowsOut, iconColor: "text-purple-500" },
  { key: "totalEngagement", label: "Engagement", icon: CursorClick, iconColor: "text-brand" },
  { key: "totalLikes", label: "Likes", icon: Heart, iconColor: "text-pink-500" },
  { key: "totalComments", label: "Comments", icon: ChatCircle, iconColor: "text-green-500" },
  { key: "totalShares", label: "Shares", icon: Share, iconColor: "text-orange-500" },
  { key: "totalClicks", label: "Clicks", icon: CursorClick, iconColor: "text-cyan-500" },
  { key: "totalSaves", label: "Saves", icon: Bookmark, iconColor: "text-yellow-500" },
  { key: "totalVideoViews", label: "Video Views", icon: VideoCamera, iconColor: "text-red-500" },
  { key: "totalWebsiteClicks", label: "Website Clicks", icon: Globe, iconColor: "text-indigo-500" },
  { key: "totalProfileVisits", label: "Profile Visits", icon: UserCircle, iconColor: "text-teal-500" },
  { key: "avgEngagementRate", label: "Avg Engagement Rate", icon: TrendUp, iconColor: "text-emerald-500" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function MetricCard({
  metric,
  value,
}: {
  metric: { key: keyof AnalyticsData; label: string; icon: typeof Eye; iconColor: string };
  value: number;
}) {
  const Icon = metric.icon;
  const displayValue = metric.key === "avgEngagementRate" ? formatRate(value) : formatNumber(value);
  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", metric.iconColor)} weight="fill" />
        <span className="text-xs text-muted-foreground">{metric.label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground tabular-nums">
        {displayValue}
      </p>
    </div>
  );
}

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/campaigns/${campaignId}/analytics`, { signal: ac.signal });
        if (!res.ok) {
          throw new Error(`Failed to fetch analytics (${res.status})`);
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { ac.abort(); };
  }, [campaignId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m.key} className="rounded-sm border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-destructive/50 bg-destructive/5 p-6 text-center space-y-2">
        <p className="text-sm font-medium text-destructive">Failed to load analytics</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No analytics data available yet. Metrics will appear once posts start publishing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Goals */}
      {data.targetImpressions && data.goalProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Campaign Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Impressions</span>
                <span className="text-foreground font-medium tabular-nums">
                  {formatNumber(data.totalImpressions)} / {formatNumber(data.targetImpressions)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(data.goalProgress.impressionsPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                Target: {formatNumber(data.targetImpressions)} impressions
              </p>
            </div>
            {data.targetEngagementRate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Engagement Rate</span>
                  <span className="text-foreground font-medium tabular-nums">
                    {formatRate(data.avgEngagementRate)} / {formatRate(data.targetEngagementRate)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(data.goalProgress.engagementRatePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Target: {formatRate(data.targetEngagementRate)} engagement rate
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => (
          <MetricCard key={m.key} metric={m} value={data[m.key] as number} />
        ))}
      </div>

      {data.topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">
              Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topPosts.map((post, idx) => (
                <div
                  key={post.postId}
                  className="flex items-center justify-between gap-4 rounded-sm border border-border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {post.title ?? `Post ${post.postId.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">
                          {post.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(post.impressions)} impressions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatNumber(post.engagement)}
                    </p>
                    <p className="text-xs text-muted-foreground">engagement</p>
                    {post.engagementRate !== null && (
                      <p className="text-xs text-brand tabular-nums">
                        {formatRate(post.engagementRate)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
