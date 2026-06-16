import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface PerformanceInsights {
  analyzedAt: string;
  campaignCount: number;
  postCount: number;
  phasePerformance: Array<{
    phaseType: string;
    avgEngagement: number;
    postCount: number;
    multiplier: number;
  }>;
  platformPerformance: Array<{
    platform: string;
    avgEngagement: number;
    postCount: number;
  }>;
  contentPatterns: {
    questionOpenings: { count: number; avgEngagement: number };
    statisticsUsage: { count: number; avgEngagement: number };
    storytellingElements: { count: number; avgEngagement: number };
  };
  optimalLengths: Array<{
    platform: string;
    minLength: number;
    maxLength: number;
    avgEngagement: number;
  }>;
  timingPatterns: {
    bestDays: string[];
    bestTimeRanges: string[];
    engagementLift: number;
  };
}

export async function analyzeCampaignPerformance(
  workspaceId: string
): Promise<PerformanceInsights> {
  logger.info("performance.analysis.start", { workspaceId });

  // Fetch all COMPLETED campaigns with posts and analytics
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId,
      status: "COMPLETED",
    },
    include: {
      posts: {
        include: {
          post: {
            include: {
              PostPlatform: true,
              AnalyticsSnapshot: {
                orderBy: { snapshotAt: "desc" },
                take: 1,
              },
            },
          },
          phase: true,
        },
      },
    },
  });

  if (campaigns.length === 0) {
    logger.info("performance.analysis.no_completed_campaigns", { workspaceId });
    return {
      analyzedAt: new Date().toISOString(),
      campaignCount: 0,
      postCount: 0,
      phasePerformance: [],
      platformPerformance: [],
      contentPatterns: {
        questionOpenings: { count: 0, avgEngagement: 0 },
        statisticsUsage: { count: 0, avgEngagement: 0 },
        storytellingElements: { count: 0, avgEngagement: 0 },
      },
      optimalLengths: [],
      timingPatterns: {
        bestDays: [],
        bestTimeRanges: [],
        engagementLift: 0,
      },
    };
  }

  // Flatten all campaign posts
  const allPosts = campaigns.flatMap((c) => c.posts);
  const postsWithAnalytics = allPosts.filter(
    (cp) => cp.post.AnalyticsSnapshot.length > 0
  );

  logger.info("performance.analysis.data_loaded", {
    workspaceId,
    campaignCount: campaigns.length,
    postCount: allPosts.length,
    postsWithAnalytics: postsWithAnalytics.length,
  });

  // Analyze phase performance
  const phasePerformance = analyzePhasePerformance(postsWithAnalytics);

  // Analyze platform performance
  const platformPerformance = analyzePlatformPerformance(postsWithAnalytics);

  // Analyze content patterns
  const contentPatterns = analyzeContentPatterns(postsWithAnalytics);

  // Analyze optimal lengths
  const optimalLengths = analyzeOptimalLengths(postsWithAnalytics);

  // Analyze timing patterns
  const timingPatterns = analyzeTimingPatterns(postsWithAnalytics);

  const insights: PerformanceInsights = {
    analyzedAt: new Date().toISOString(),
    campaignCount: campaigns.length,
    postCount: allPosts.length,
    phasePerformance,
    platformPerformance,
    contentPatterns,
    optimalLengths,
    timingPatterns,
  };

  logger.info("performance.analysis.complete", {
    workspaceId,
    campaignCount: campaigns.length,
    insightsGenerated: true,
  });

  return insights;
}

function analyzePhasePerformance(
  posts: Array<{
    phase: { phase: string } | null;
    post: { AnalyticsSnapshot: Array<{ likes: number; comments: number; shares: number }> };
  }>
) {
  const phaseMap = new Map<string, { totalEngagement: number; count: number }>();

  for (const cp of posts) {
    if (!cp.phase) continue;
    const phaseType = cp.phase.phase;
    const analytics = cp.post.AnalyticsSnapshot[0];
    if (!analytics) continue;

    const engagement = analytics.likes + analytics.comments + analytics.shares;
    const existing = phaseMap.get(phaseType) || { totalEngagement: 0, count: 0 };
    existing.totalEngagement += engagement;
    existing.count += 1;
    phaseMap.set(phaseType, existing);
  }

  // Calculate overall average
  const allEngagements = Array.from(phaseMap.values()).map(
    (p) => p.totalEngagement / p.count
  );
  const overallAvg =
    allEngagements.reduce((a, b) => a + b, 0) / allEngagements.length;

  return Array.from(phaseMap.entries()).map(([phaseType, data]) => {
    const avgEngagement = data.totalEngagement / data.count;
    const multiplier = overallAvg > 0 ? avgEngagement / overallAvg : 1;

    return {
      phaseType,
      avgEngagement: Math.round(avgEngagement),
      postCount: data.count,
      multiplier: Math.round(multiplier * 10) / 10,
    };
  });
}

function analyzePlatformPerformance(
  posts: Array<{
    post: {
      PostPlatform: Array<{ platform: string }>;
      AnalyticsSnapshot: Array<{ likes: number; comments: number; shares: number }>;
    };
  }>
) {
  const platformMap = new Map<string, { totalEngagement: number; count: number }>();

  for (const cp of posts) {
    const analytics = cp.post.AnalyticsSnapshot[0];
    if (!analytics) continue;

    const engagement = analytics.likes + analytics.comments + analytics.shares;

    for (const pp of cp.post.PostPlatform) {
      const existing = platformMap.get(pp.platform) || {
        totalEngagement: 0,
        count: 0,
      };
      existing.totalEngagement += engagement;
      existing.count += 1;
      platformMap.set(pp.platform, existing);
    }
  }

  return Array.from(platformMap.entries())
    .map(([platform, data]) => ({
      platform,
      avgEngagement: Math.round(data.totalEngagement / data.count),
      postCount: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function analyzeContentPatterns(
  posts: Array<{
    post: {
      PostPlatform: Array<{ content: string }>;
      AnalyticsSnapshot: Array<{ likes: number; comments: number; shares: number }>;
    };
  }>
) {
  const patterns = {
    questionOpenings: { engagements: [] as number[], count: 0 },
    statisticsUsage: { engagements: [] as number[], count: 0 },
    storytellingElements: { engagements: [] as number[], count: 0 },
  };

  for (const cp of posts) {
    const analytics = cp.post.AnalyticsSnapshot[0];
    if (!analytics) continue;

    const engagement = analytics.likes + analytics.comments + analytics.shares;

    for (const pp of cp.post.PostPlatform) {
      const content = pp.content.toLowerCase();

      // Question openings
      if (content.match(/^(how|what|why|when|where|who|can|do|is|are)\b.*\?/)) {
        patterns.questionOpenings.engagements.push(engagement);
        patterns.questionOpenings.count += 1;
      }

      // Statistics usage
      if (content.match(/\d+%|\d+x|\d+\s*(times|percent|more|less)/)) {
        patterns.statisticsUsage.engagements.push(engagement);
        patterns.statisticsUsage.count += 1;
      }

      // Storytelling elements
      if (
        content.match(
          /\b(story|journey|experience|discovered|learned|realized|transformed)\b/
        )
      ) {
        patterns.storytellingElements.engagements.push(engagement);
        patterns.storytellingElements.count += 1;
      }
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    questionOpenings: {
      count: patterns.questionOpenings.count,
      avgEngagement: avg(patterns.questionOpenings.engagements),
    },
    statisticsUsage: {
      count: patterns.statisticsUsage.count,
      avgEngagement: avg(patterns.statisticsUsage.engagements),
    },
    storytellingElements: {
      count: patterns.storytellingElements.count,
      avgEngagement: avg(patterns.storytellingElements.engagements),
    },
  };
}

function analyzeOptimalLengths(
  posts: Array<{
    post: {
      PostPlatform: Array<{ platform: string; content: string }>;
      AnalyticsSnapshot: Array<{ likes: number; comments: number; shares: number }>;
    };
  }>
) {
  const platformLengths = new Map<
    string,
    Array<{ length: number; engagement: number }>
  >();

  for (const cp of posts) {
    const analytics = cp.post.AnalyticsSnapshot[0];
    if (!analytics) continue;

    const engagement = analytics.likes + analytics.comments + analytics.shares;

    for (const pp of cp.post.PostPlatform) {
      const length = pp.content.length;
      const existing = platformLengths.get(pp.platform) || [];
      existing.push({ length, engagement });
      platformLengths.set(pp.platform, existing);
    }
  }

  return Array.from(platformLengths.entries()).map(([platform, data]) => {
    // Group by length buckets (0-100, 100-200, 200-300, etc.)
    const buckets = new Map<string, { totalEngagement: number; count: number }>();

    for (const item of data) {
      const bucket = Math.floor(item.length / 100) * 100;
      const key = `${bucket}-${bucket + 100}`;
      const existing = buckets.get(key) || { totalEngagement: 0, count: 0 };
      existing.totalEngagement += item.engagement;
      existing.count += 1;
      buckets.set(key, existing);
    }

    // Find best performing bucket
    let bestBucket = { range: "0-100", avgEngagement: 0 };
    for (const [range, stats] of buckets.entries()) {
      const avg = stats.totalEngagement / stats.count;
      if (avg > bestBucket.avgEngagement) {
        bestBucket = { range, avgEngagement: avg };
      }
    }

    const [min, max] = bestBucket.range.split("-").map(Number);

    return {
      platform,
      minLength: min,
      maxLength: max,
      avgEngagement: Math.round(bestBucket.avgEngagement),
    };
  });
}

function analyzeTimingPatterns(
  posts: Array<{
    post: {
      scheduledAt: Date | null;
      AnalyticsSnapshot: Array<{ likes: number; comments: number; shares: number }>;
    };
  }>
) {
  const dayEngagements = new Map<string, number[]>();
  const timeEngagements = new Map<string, number[]>();

  for (const cp of posts) {
    const analytics = cp.post.AnalyticsSnapshot[0];
    if (!analytics || !cp.post.scheduledAt) continue;

    const engagement = analytics.likes + analytics.comments + analytics.shares;
    const date = new Date(cp.post.scheduledAt);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    const hour = date.getHours();

    // Day patterns
    const dayExisting = dayEngagements.get(day) || [];
    dayExisting.push(engagement);
    dayEngagements.set(day, dayExisting);

    // Time patterns (morning, afternoon, evening)
    let timeRange = "night";
    if (hour >= 6 && hour < 12) timeRange = "morning";
    else if (hour >= 12 && hour < 18) timeRange = "afternoon";
    else if (hour >= 18 && hour < 22) timeRange = "evening";

    const timeExisting = timeEngagements.get(timeRange) || [];
    timeExisting.push(engagement);
    timeEngagements.set(timeRange, timeExisting);
  }

  // Find best days
  const dayAvgs = Array.from(dayEngagements.entries()).map(([day, engs]) => ({
    day,
    avg: engs.reduce((a, b) => a + b, 0) / engs.length,
  }));
  dayAvgs.sort((a, b) => b.avg - a.avg);
  const bestDays = dayAvgs.slice(0, 3).map((d) => d.day);

  // Find best time ranges
  const timeAvgs = Array.from(timeEngagements.entries()).map(
    ([range, engs]) => ({
      range,
      avg: engs.reduce((a, b) => a + b, 0) / engs.length,
    })
  );
  timeAvgs.sort((a, b) => b.avg - a.avg);
  const bestTimeRanges = timeAvgs.slice(0, 2).map((t) => t.range);

  // Calculate engagement lift
  const overallAvg =
    dayAvgs.reduce((a, b) => a + b.avg, 0) / dayAvgs.length || 1;
  const bestDayAvg = dayAvgs[0]?.avg || 0;
  const engagementLift = Math.round(((bestDayAvg - overallAvg) / overallAvg) * 100);

  return {
    bestDays,
    bestTimeRanges,
    engagementLift: Math.max(0, engagementLift),
  };
}
