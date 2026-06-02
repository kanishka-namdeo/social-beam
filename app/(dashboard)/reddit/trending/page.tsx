import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkle,
  ArrowClockwise,
} from "@phosphor-icons/react/ssr";
import { SubredditManager } from "@/components/reddit/subreddit-manager";
import { TrendingEmptyState } from "@/components/reddit/trending-empty-state";
import { TrendingTable } from "@/components/reddit/trending-table";
import { PeriodFilters } from "./period-filters";
import { SubredditFilterTabs } from "./subreddit-filter-tabs";
import { RefreshTrendsButton } from "./refresh-trends-button";
import { subHours } from "@/lib/utils/dates";

const VALID_PERIODS = [6, 24, 168, 720] as const;
const DEFAULT_PERIOD = 24;

export default async function RedditTrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; subreddit?: string }>;
}) {
  const session = await auth();
  const user = session?.user as { workspaceId?: string } | undefined;
  const workspaceId = user?.workspaceId;
  if (!workspaceId) redirect("/login");

  const resolvedParams = await searchParams;
  const hours = VALID_PERIODS.includes(Number(resolvedParams?.hours) as (typeof VALID_PERIODS)[number])
    ? Number(resolvedParams?.hours)
    : DEFAULT_PERIOD;
  const subredditFilter = resolvedParams?.subreddit;
  const since = subHours(new Date(), hours);

  const whereClause: Record<string, unknown> = {
    workspaceId,
    scrapedAt: { gte: since },
  };

  if (subredditFilter) {
    whereClause.subreddit = subredditFilter;
  }

  const [posts, subredditConfigs, summary] = await Promise.all([
    prisma.redditTrendingPost.findMany({
      where: whereClause,
      orderBy: [{ relevanceScore: "desc" }, { upvotes: "desc" }],
      take: 200,
    }),
    prisma.redditSubredditConfig.findMany({
      where: { workspaceId },
      orderBy: { subreddit: "asc" },
    }),
    prisma.redditTrendingPost.groupBy({
      by: ["subreddit"],
      _count: true,
      _max: { scrapedAt: true },
      _avg: { relevanceScore: true },
      where: { workspaceId, scrapedAt: { gte: since } },
    }),
  ]);

  const lastScrapedAt = summary.length > 0
    ? Math.max(...summary.map((s) => new Date(s._max.scrapedAt ?? 0).getTime()))
    : null;

  const actionableCount = posts.filter((p) => p.isActionable).length;
  const avgRelevance = posts.length > 0
    ? posts.reduce((sum, p) => sum + (p.relevanceScore ?? 0), 0) / posts.length
    : 0;

  const hasData = posts.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div id="manage-subreddits" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Sparkle className="size-6 text-brand" weight="fill" />
            Reddit Trending Radar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track trending discussions across your configured subreddits.
          </p>
          {lastScrapedAt && lastScrapedAt > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowClockwise className="size-3" />
              Last refreshed: {new Date(lastScrapedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
            <SubredditManager />
            {hasData && (
              <RefreshTrendsButton />
            )}
            <PeriodFilters
              hours={hours}
              subredditFilter={subredditFilter}
            />
          </div>
      </div>

      {/* Empty States */}
      {posts.length === 0 && (
        <TrendingEmptyState hasSubreddits={subredditConfigs.length > 0} />
      )}

      {/* Data content */}
      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Posts</CardDescription>
                <CardTitle className="text-2xl">{posts.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-ai-surface">
              <CardHeader className="pb-2">
                <CardDescription>Actionable Trends</CardDescription>
                <CardTitle className="text-2xl text-ai-confidence-high">{actionableCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Relevance</CardDescription>
                <CardTitle className="text-2xl">{(avgRelevance * 100).toFixed(0)}%</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tracked Subreddits</CardDescription>
                <CardTitle className="text-2xl">{subredditConfigs.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Subreddit Filter Tabs */}
          {subredditConfigs.length > 0 && (
            <SubredditFilterTabs
              hours={hours}
              subredditFilter={subredditFilter}
              subredditConfigs={subredditConfigs}
            />
          )}

          {/* Summary by Subreddit */}
          {summary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subreddit Activity</CardTitle>
                <CardDescription>Post counts and average relevance by subreddit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.map((s) => (
                    <div
                      key={s.subreddit}
                      className="rounded-sm border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          r/{s.subreddit}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {s._count} posts
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Avg relevance: {((s._avg.relevanceScore ?? 0) * 100).toFixed(0)}%
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Last scraped: {s._max.scrapedAt ? new Date(s._max.scrapedAt).toLocaleString() : "Never"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending Posts Table with action handoff */}
          <TrendingTable posts={posts} hours={hours} />
        </>
      )}
    </div>
  );
}
