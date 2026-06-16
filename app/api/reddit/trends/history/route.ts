import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface TrendDataPoint {
  period: string;
  postCount: number;
  avgUpvotes: number;
  avgComments: number;
  avgRelevance: number;
  topTopics: string[];
  emergingTopics: string[];
  brandMentions: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { Workspace: { take: 1, select: { id: true } } },
    });

    if (!user || user.Workspace.length === 0) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const workspaceId = user.Workspace[0].id;

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get("period") || "week") as "week" | "month"; // "week" or "month"
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await prisma.redditTrendingPost.findMany({
      where: {
        workspaceId,
        scrapedAt: { gte: startDate },
      },
      select: {
        scrapedAt: true,
        upvotes: true,
        commentCount: true,
        relevanceScore: true,
        topicTags: true,
        title: true,
        velocityScore: true,
        trendPhase: true,
      },
      orderBy: { scrapedAt: "asc" },
    });

    const aggregated = aggregateByPeriod(posts, period, days);

    logger.info("reddit.trends.history.fetched", {
      workspaceId,
      period,
      days,
      dataPoints: aggregated.length,
    });

    return NextResponse.json({
      history: aggregated,
      summary: calculateSummary(aggregated),
    });
  } catch (error) {
    logger.error("reddit.trends.history.error", { error });
    return NextResponse.json(
      { error: "Failed to fetch trend history" },
      { status: 500 }
    );
  }
}

function aggregateByPeriod(
  posts: Array<{
    scrapedAt: Date;
    upvotes: number;
    commentCount: number;
    relevanceScore: number | null;
    topicTags: string[];
    title: string;
    velocityScore: number | null;
    trendPhase: string | null;
  }>,
  period: "week" | "month",
  totalDays: number
): TrendDataPoint[] {
  const buckets = new Map<string, typeof posts>();

  for (const post of posts) {
    const date = new Date(post.scrapedAt);
    let key: string;

    if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(post);
  }

  const result: TrendDataPoint[] = [];

  const sortedKeys = Array.from(buckets.keys()).sort();

  for (const key of sortedKeys) {
    const bucketPosts = buckets.get(key)!;

    const postCount = bucketPosts.length;
    const avgUpvotes =
      bucketPosts.reduce((sum, p) => sum + p.upvotes, 0) / postCount;
    const avgComments =
      bucketPosts.reduce((sum, p) => sum + p.commentCount, 0) / postCount;
    const avgRelevance =
      bucketPosts.reduce((sum, p) => sum + (p.relevanceScore || 0), 0) /
      postCount;

    const topicCounts = new Map<string, number>();
    for (const post of bucketPosts) {
      for (const tag of post.topicTags) {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      }
    }

    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    const emergingTopics = bucketPosts
      .filter((p) => p.trendPhase === "emerging" && p.velocityScore && p.velocityScore > 5)
      .flatMap((p) => p.topicTags)
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .slice(0, 5);

    const brandMentions = bucketPosts.filter(
      (p) => p.title.toLowerCase().includes("brand") || p.topicTags.some((t) => t.toLowerCase().includes("brand"))
    ).length;

    result.push({
      period: key,
      postCount,
      avgUpvotes: Math.round(avgUpvotes),
      avgComments: Math.round(avgComments),
      avgRelevance: Math.round(avgRelevance * 100) / 100,
      topTopics,
      emergingTopics,
      brandMentions,
    });
  }

  return result;
}

function calculateSummary(history: TrendDataPoint[]) {
  if (history.length === 0) {
    return {
      totalPosts: 0,
      avgGrowthRate: 0,
      topTopic: null,
      emergingTopicCount: 0,
    };
  }

  const totalPosts = history.reduce((sum, h) => sum + h.postCount, 0);

  let avgGrowthRate = 0;
  if (history.length > 1) {
    const first = history[0].postCount;
    const last = history[history.length - 1].postCount;
    avgGrowthRate = first > 0 ? ((last - first) / first) * 100 : 0;
  }

  const allTopics = history.flatMap((h) => h.topTopics);
  const topicCounts = new Map<string, number>();
  for (const topic of allTopics) {
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }
  const topTopic = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const emergingTopicCount = new Set(history.flatMap((h) => h.emergingTopics)).size;

  return {
    totalPosts,
    avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
    topTopic,
    emergingTopicCount,
  };
}
