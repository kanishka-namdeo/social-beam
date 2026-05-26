import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { AudienceGrowthChart } from "@/components/analytics/audience-growth-chart";
import { ContentRankingTable } from "@/components/analytics/content-ranking-table";
import { BestTimesHeatmap } from "@/components/analytics/best-times-heatmap";
import { MetricCards } from "@/components/analytics/metric-cards";
import { buildMetricCards } from "@/lib/analytics/metric-cards-utils";
import { PlatformComparison } from "@/components/analytics/platform-comparison";
import { ConfidenceCorrelationChart } from "@/components/analytics/confidence-correlation-chart";
import { PublishingReliabilityTable } from "@/components/analytics/publishing-reliability-table";
import { PostFrequencyChart } from "@/components/analytics/post-frequency-chart";
import { OptimalTimesRecommendations } from "@/components/analytics/optimal-times-recommendations";
import { PeriodSelector } from "@/components/analytics/period-selector";
import type { HeatmapSlot } from "@/components/analytics/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartBar, TrendUp, Users, Eye, Cursor } from "@phosphor-icons/react/ssr";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";
import { subDays } from "@/lib/utils/dates";

const VALID_PERIODS = [7, 30, 90] as const;
const DEFAULT_PERIOD = 30;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const workspaceId = user?.workspaceId as string | undefined;
  if (!workspaceId) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const periodDays = VALID_PERIODS.includes(Number(resolvedSearchParams?.period) as (typeof VALID_PERIODS)[number])
    ? Number(resolvedSearchParams?.period)
    : DEFAULT_PERIOD;

  const now = new Date();
  const currentStart = subDays(now, periodDays);
  const previousStart = subDays(now, periodDays * 2);

  // Fetch current and previous period analytics in parallel
  const [
    currentAnalytics,
    previousAnalytics,
    currentPosts,
    currentFollowersGrouped,
    previousFollowers,
    allFollowerSnapshots,
  ] = await Promise.all([
    prisma.analyticsSnapshot.findMany({
      where: { snapshotAt: { gte: currentStart }, post: { workspaceId } },
    }),
    prisma.analyticsSnapshot.findMany({
      where: { snapshotAt: { gte: previousStart, lt: currentStart }, post: { workspaceId } },
    }),
    prisma.post.findMany({
      where: { workspaceId, publishedAt: { gte: currentStart } },
      select: { id: true, title: true, publishedAt: true, confidence: true, platforms: { select: { platform: true, status: true } } },
    }),
    prisma.followerSnapshot.groupBy({
      by: ["platform"],
      _max: { snapshotAt: true },
      _sum: { followers: true },
      where: { workspaceId },
    }),
    prisma.followerSnapshot.findMany({
      where: { workspaceId, snapshotAt: { gte: previousStart } },
      orderBy: { snapshotAt: "asc" },
    }),
    prisma.followerSnapshot.findMany({
      where: { workspaceId, snapshotAt: { gte: currentStart } },
      orderBy: { snapshotAt: "asc" },
    }),
  ]);

  // Aggregate current period metrics
  const totalImpressions = currentAnalytics.reduce((sum, a) => sum + a.impressions, 0);
  const totalEngagements = currentAnalytics.reduce((sum, a) => sum + a.likes + a.comments + a.shares, 0);
  const totalClicks = currentAnalytics.reduce((sum, a) => sum + a.clicks, 0);
  const avgEngagementRate = currentAnalytics.length > 0
    ? currentAnalytics.reduce((sum, a) => sum + (a.engagementRate ?? 0), 0) / currentAnalytics.length
    : 0;

  // Aggregate previous period metrics
  const prevImpressions = previousAnalytics.reduce((sum, a) => sum + a.impressions, 0);
  const prevEngagements = previousAnalytics.reduce((sum, a) => sum + a.likes + a.comments + a.shares, 0);
  const prevClicks = previousAnalytics.reduce((sum, a) => sum + a.clicks, 0);
  const prevEngagementRate = previousAnalytics.length > 0
    ? previousAnalytics.reduce((sum, a) => sum + (a.engagementRate ?? 0), 0) / previousAnalytics.length
    : 0;

  // Net follower growth
  const currentNetFollowers = currentFollowersGrouped.reduce((sum, f) => sum + (f._sum.followers ?? 0), 0);
  const earliestFollowers = previousFollowers.reduce((sum, f) => sum + f.followers, 0);
  const netFollowers = currentNetFollowers - earliestFollowers;
  const prevFollowersVal = earliestFollowers;

  // Time series: group by day with platform breakdown
  const dailyMap = new Map<string, {
    date: string;
    overall: { impressions: number; engagements: number; reach: number; clicks: number; engagementRate: number; count: number };
    byPlatform: Record<string, { impressions: number; engagements: number; reach: number; clicks: number; engagementRate: number; count: number }>;
  }>();

  for (let i = periodDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, {
      date: key,
      overall: { impressions: 0, engagements: 0, reach: 0, clicks: 0, engagementRate: 0, count: 0 },
      byPlatform: {},
    });
  }

  for (const a of currentAnalytics) {
    const key = a.snapshotAt.toISOString().split("T")[0];
    const existing = dailyMap.get(key);
    if (existing) {
      existing.overall.impressions += a.impressions;
      existing.overall.engagements += a.likes + a.comments + a.shares;
      existing.overall.reach += a.reach;
      existing.overall.clicks += a.clicks;
      existing.overall.engagementRate += a.engagementRate ?? 0;
      existing.overall.count += 1;
      if (!existing.byPlatform[a.platform]) {
        existing.byPlatform[a.platform] = { impressions: 0, engagements: 0, reach: 0, clicks: 0, engagementRate: 0, count: 0 };
      }
      const pf = existing.byPlatform[a.platform];
      pf.impressions += a.impressions;
      pf.engagements += a.likes + a.comments + a.shares;
      pf.reach += a.reach;
      pf.clicks += a.clicks;
      pf.engagementRate += a.engagementRate ?? 0;
      pf.count += 1;
    }
  }

  const timeSeries = Array.from(dailyMap.values()).map((d) => ({
    date: d.date,
    overall: {
      impressions: d.overall.impressions,
      engagements: d.overall.engagements,
      reach: d.overall.reach,
      clicks: d.overall.clicks,
      engagementRate: d.overall.count > 0 ? d.overall.engagementRate / d.overall.count : 0,
    },
    byPlatform: Object.fromEntries(
      Object.entries(d.byPlatform).map(([platform, pf]) => [
        platform,
        { impressions: pf.impressions, engagements: pf.engagements, reach: pf.reach, clicks: pf.clicks, engagementRate: pf.count > 0 ? pf.engagementRate / pf.count : 0 },
      ])
    ),
  }));

  // Audience growth
  const audienceTimeSeries: Record<string, { date: string; followers: number }[]> = {};
  for (const f of allFollowerSnapshots) {
    if (!audienceTimeSeries[f.platform]) audienceTimeSeries[f.platform] = [];
    audienceTimeSeries[f.platform].push({ date: f.snapshotAt.toISOString(), followers: f.followers });
  }

  const netChangeByPlatform: Record<string, { start: number; end: number; netChange: number }> = {};
  for (const [platform, entries] of Object.entries(audienceTimeSeries)) {
    if (entries.length === 0) continue;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const start = sorted[0].followers;
    const end = sorted[sorted.length - 1].followers;
    netChangeByPlatform[platform] = { start, end, netChange: end - start };
  }
  const totalNetChange = Object.values(netChangeByPlatform).reduce((sum, v) => sum + v.netChange, 0);

  // Platform comparison
  const platformMap = new Map<string, { platform: string; impressions: number; engagements: number; engagementRate: number; clicks: number; followers: number; netFollowers: number }>();
  for (const a of currentAnalytics) {
    if (!platformMap.has(a.platform)) {
      platformMap.set(a.platform, { platform: a.platform, impressions: 0, engagements: 0, engagementRate: 0, clicks: 0, followers: 0, netFollowers: 0 });
    }
    const p = platformMap.get(a.platform)!;
    p.impressions += a.impressions;
    p.engagements += a.likes + a.comments + a.shares;
    p.engagementRate += a.engagementRate ?? 0;
    p.clicks += a.clicks;
  }
  for (const pf of platformMap.values()) {
    const cf = currentFollowersGrouped.find((f) => f.platform === pf.platform);
    pf.followers = cf?._sum.followers ?? 0;
    const pa = currentAnalytics.filter((a) => a.platform === pf.platform);
    pf.engagementRate = pa.length > 0 ? pf.engagementRate / pa.length : 0;
    const nc = netChangeByPlatform[pf.platform];
    pf.netFollowers = nc?.netChange ?? 0;
  }
  const platformMetrics = Array.from(platformMap.values());

  // Content ranking
  const rankedPosts = currentPosts
    .map((post) => {
      const postAnalytics = currentAnalytics.filter((a) => a.postId === post.id);
      const totalEng = postAnalytics.reduce((sum, a) => sum + a.likes + a.comments + a.shares, 0);
      const totalImp = postAnalytics.reduce((sum, a) => sum + a.impressions, 0);
      return {
        id: post.id, title: post.title, platform: post.platforms[0]?.platform ?? "unknown",
        engagementRate: totalImp > 0 ? totalEng / totalImp : 0, impressions: totalImp,
        likes: postAnalytics.reduce((sum, a) => sum + a.likes, 0),
        comments: postAnalytics.reduce((sum, a) => sum + a.comments, 0),
        shares: postAnalytics.reduce((sum, a) => sum + a.shares, 0),
        publishedAt: post.publishedAt?.toISOString() ?? null, rank: 0,
      };
    })
    .sort((a, b) => b.engagementRate - a.engagementRate);
  const topPosts = rankedPosts.slice(0, 10).map((p, i) => ({ ...p, rank: i + 1 }));
  const bottomPosts = rankedPosts.reverse().slice(0, 5).map((p, i) => ({ ...p, rank: i + 1 }));

  // Heatmap
  const heatmapSlots: HeatmapSlot[] = [];
  const heatmapMap = new Map<string, { totalEng: number; count: number }>();
  for (const a of currentAnalytics) {
    const d = a.snapshotAt;
    const key = `${d.getDay()}-${d.getHours()}`;
    const existing = heatmapMap.get(key);
    if (existing) { existing.totalEng += a.likes + a.comments + a.shares; existing.count += 1; }
    else { heatmapMap.set(key, { totalEng: a.likes + a.comments + a.shares, count: 1 }); }
  }
  for (const [key, val] of heatmapMap) {
    const [dayStr, hourStr] = key.split("-");
    heatmapSlots.push({ dayOfWeek: parseInt(dayStr, 10), hour: parseInt(hourStr, 10), avgEngagement: val.totalEng / val.count, postCount: val.count });
  }

  // Confidence correlation
  const confidenceGroups: Record<string, { totalEngagements: number; totalImpressions: number; count: number; avgEngagementRate: number }> = {};
  for (const post of currentPosts) {
    const conf = post.confidence ?? "UNKNOWN";
    if (!confidenceGroups[conf]) confidenceGroups[conf] = { totalEngagements: 0, totalImpressions: 0, count: 0, avgEngagementRate: 0 };
    const group = confidenceGroups[conf];
    const postAnalytics = currentAnalytics.filter((a) => a.postId === post.id);
    const engSum = postAnalytics.reduce((s, a) => s + a.likes + a.comments + a.shares, 0);
    group.totalEngagements += engSum;
    group.totalImpressions += postAnalytics.reduce((s, a) => s + a.impressions, 0);
    group.count += 1;
    group.avgEngagementRate += postAnalytics.reduce((s, a) => s + (a.engagementRate ?? 0), 0);
  }
  const confidenceCorrelation = Object.entries(confidenceGroups).map(([level, data]) => ({
    level, count: data.count, avgEngagementRate: data.count > 0 ? data.avgEngagementRate / data.count : 0,
    totalEngagements: data.totalEngagements, totalImpressions: data.totalImpressions,
  }));

  // Publishing reliability
  const platformPublishStats: Record<string, { total: number; published: number; failed: number }> = {};
  for (const post of currentPosts) {
    for (const pp of post.platforms) {
      if (!platformPublishStats[pp.platform]) platformPublishStats[pp.platform] = { total: 0, published: 0, failed: 0 };
      platformPublishStats[pp.platform].total += 1;
      if (pp.status === "PUBLISHED") platformPublishStats[pp.platform].published += 1;
      else if (pp.status === "FAILED") platformPublishStats[pp.platform].failed += 1;
    }
  }
  const publishingReliability = Object.entries(platformPublishStats).map(([platform, stats]) => ({
    platform, total: stats.total, published: stats.published, failed: stats.failed,
    successRate: stats.total > 0 ? stats.published / stats.total : 0, failRate: stats.total > 0 ? stats.failed / stats.total : 0,
  }));

  // Post frequency
  const dailyPostCounts: Record<string, number> = {};
  for (const post of currentPosts) {
    if (post.publishedAt) {
      const dayKey = post.publishedAt.toISOString().split("T")[0];
      dailyPostCounts[dayKey] = (dailyPostCounts[dayKey] ?? 0) + 1;
    }
  }
  const postsPerDayData: { date: string; count: number }[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const key = d.toISOString().split("T")[0];
    postsPerDayData.push({ date: key, count: dailyPostCounts[key] ?? 0 });
  }
  const avgPostsPerDay = postsPerDayData.length > 0 ? postsPerDayData.reduce((s, v) => s + v.count, 0) / postsPerDayData.length : 0;
  const currentStreak = computeStreak(postsPerDayData);

  // Engagement efficiency per follower
  const totalFollowers = currentFollowersGrouped.reduce((s, f) => s + (f._sum.followers ?? 0), 0);
  const totalAllEngagements = currentPosts.reduce((s, p) => s + currentAnalytics.filter((a) => a.postId === p.id).reduce((es, a) => es + a.likes + a.comments + a.shares, 0), 0);
  const engagementPerFollower = totalFollowers > 0 ? totalAllEngagements / totalFollowers : 0;

  if (currentAnalytics.length === 0 && currentPosts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track performance across all your social platforms.
          </p>
        </div>
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <ChartBar className="mx-auto mb-2 size-12 text-muted-foreground" weight="light" />
              <CardTitle className="text-lg">No data for this period</CardTitle>
              <CardDescription className="mt-2">
                Try selecting a different date range or check back after publishing more posts.
              </CardDescription>
              <Button className="mt-2" asChild>
                <a href="/compose">Compose a post</a>
              </Button>
            </CardContent>
          </Card>

          {/* Worked example preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="size-4 text-brand" weight="fill" />
                Here&apos;s what you&apos;ll see
              </CardTitle>
              <CardDescription>
                A preview of your analytics dashboard once posts go live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MockMetricCard
                  icon={<Eye className="size-5" weight="fill" />}
                  label="Impressions"
                  value="12.4k"
                  change="+18%"
                  positive
                />
                <MockMetricCard
                  icon={<Cursor className="size-5" weight="fill" />}
                  label="Engagements"
                  value="847"
                  change="+12%"
                  positive
                />
                <MockMetricCard
                  icon={<Users className="size-5" weight="fill" />}
                  label="Net Followers"
                  value="+124"
                  change="+8%"
                  positive
                />
                <MockMetricCard
                  icon={<TrendUp className="size-5" weight="fill" />}
                  label="Engagement Rate"
                  value="6.8%"
                  change="+2.1%"
                  positive
                />
              </div>
              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Top post this week</p>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">Instagram</Badge>
                  <span className="text-sm text-foreground truncate">&ldquo;5 tips for better social media engagement&rdquo;</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">3.2k views</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track performance across all your social platforms over the last {periodDays} days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HintTooltip
            hint="Tip: Engagement rate = (likes + comments + shares) / followers. Higher rates mean better algorithmic reach"
            icon="info"
          />
          <PeriodSelector currentPeriod={periodDays} />
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards
        metrics={buildMetricCards({
          totalImpressions, prevImpressions,
          totalEngagements, prevEngagements,
          totalClicks, prevClicks,
          avgEngagementRate, prevEngagementRate,
          netFollowers, prevFollowers: prevFollowersVal,
        })}
      />

      {/* Time Series Chart */}
      <AnalyticsOverview timeSeries={timeSeries} />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AudienceGrowthChart
          timeSeries={audienceTimeSeries}
          netChangeByPlatform={netChangeByPlatform}
          totalNetChange={totalNetChange}
        />
        <PlatformComparison platformMetrics={platformMetrics} />
      </div>

      {/* Content Rankings */}
      <ContentRankingTable topPosts={topPosts} bottomPosts={bottomPosts} />

      {/* Best Times Heatmap */}
      <BestTimesHeatmap data={heatmapSlots} />

      {/* New Advanced Analytics Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ConfidenceCorrelationChart data={confidenceCorrelation} />
        <PublishingReliabilityTable data={publishingReliability} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PostFrequencyChart
          data={postsPerDayData}
          avgPostsPerDay={avgPostsPerDay}
          currentStreak={currentStreak}
          engagementPerFollower={engagementPerFollower}
        />
        <OptimalTimesRecommendations
          heatmapData={heatmapSlots}
          platformMetrics={platformMetrics}
        />
      </div>
    </div>
  );
}

function MockMetricCard({ icon, label, value, change, positive }: { icon: React.ReactNode; label: string; value: string; change: string; positive: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-left">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        <span className={cn("text-xs font-medium tabular-nums", positive ? "text-success" : "text-destructive")}>
          {change}
        </span>
      </div>
    </div>
  );
}

function computeStreak(postsPerDayData: { date: string; count: number }[]): number {
  let streak = 0;
  for (let i = postsPerDayData.length - 1; i >= 0; i--) {
    if (postsPerDayData[i].count > 0) streak += 1;
    else break;
  }
  return streak;
}
