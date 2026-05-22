import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkle,
  TrendUp,
  ChatText,
  ArrowSquareOut,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const VALID_PERIODS = [6, 24, 168, 720] as const;
const DEFAULT_PERIOD = 24;
const PERIOD_LABELS: Record<number, string> = {
  6: "6h",
  24: "24h",
  168: "7d",
  720: "30d",
};

function subHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() - hours);
  return d;
}

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

  const actionableCount = posts.filter((p) => p.isActionable).length;
  const avgRelevance = posts.length > 0
    ? posts.reduce((sum, p) => sum + (p.relevanceScore ?? 0), 0) / posts.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Sparkle className="size-6 text-brand" weight="fill" />
            Reddit Trending Radar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track trending discussions across your configured subreddits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {VALID_PERIODS.map((h) => (
            <Button
              key={h}
              variant={hours === h ? "default" : "outline"}
              size="sm"
              asChild
            >
              <a href={`/dashboard/reddit/trending?hours=${h}${subredditFilter ? `&subreddit=${subredditFilter}` : ""}`}>
                {PERIOD_LABELS[h]}
              </a>
            </Button>
          ))}
        </div>
      </div>

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
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!subredditFilter ? "default" : "outline"}
            size="sm"
            asChild
          >
            <a href={`/dashboard/reddit/trending?hours=${hours}`}>
              All
            </a>
          </Button>
          {subredditConfigs.map((cfg) => (
            <Button
              key={cfg.subreddit}
              variant={subredditFilter === cfg.subreddit ? "default" : "outline"}
              size="sm"
              asChild
            >
              <a href={`/dashboard/reddit/trending?hours=${hours}&subreddit=${cfg.subreddit}`}>
                r/{cfg.subreddit}
              </a>
            </Button>
          ))}
        </div>
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
                  className="rounded-lg border border-border p-3"
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

      {/* Trending Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trending Posts</CardTitle>
          <CardDescription>
            {posts.length} posts from the last {hours} hours, sorted by relevance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No trending data for this period. Add subreddits to track and trigger your first scrape.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Post</TableHead>
                    <TableHead>Subreddit</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <TrendUp className="size-3.5" weight="bold" />
                        Upvotes
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <ChatText className="size-3.5" weight="bold" />
                        Comments
                      </span>
                    </TableHead>
                    <TableHead>Relevance</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:underline line-clamp-2"
                        >
                          {post.title}
                        </a>
                        {post.relevanceReason && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {post.relevanceReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        r/{post.subreddit}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1 text-success">
                          <TrendUp className="size-3.5" weight="bold" />
                          {post.upvotes.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {post.commentCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {post.relevanceScore != null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              post.relevanceScore >= 0.7
                                ? "bg-ai-confidence-high/10 text-ai-confidence-high"
                                : post.relevanceScore >= 0.4
                                ? "bg-ai-confidence-medium/10 text-ai-confidence-medium"
                                : "bg-ai-confidence-low/10 text-ai-confidence-low",
                            )}
                          >
                            {(post.relevanceScore * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {post.suggestedAction ? (
                          <span className="flex items-center gap-1">
                            <ArrowSquareOut className="size-3.5" weight="bold" />
                            {post.suggestedAction}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
