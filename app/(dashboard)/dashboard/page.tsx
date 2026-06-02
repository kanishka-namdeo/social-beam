import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/onboarding";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PencilSimple, Calendar, ChartBar, MagnifyingGlass, GearSix } from "@phosphor-icons/react/ssr";
import { StartingVerbs } from "@/components/dashboard/starting-verbs";
import { AIComposePrompt } from "@/components/dashboard/ai-compose-prompt";
import { WorkedExampleEmptyState } from "@/components/dashboard/worked-example-empty-state";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { CustomizeDashboardDialogContainer } from "@/components/dashboard/customize-dashboard-dialog";
import type { WidgetLayout } from "@/lib/dashboard/widget-registry";
import { DEFAULT_WIDGET_LAYOUT } from "@/lib/dashboard/widget-registry";
import { subHours } from "@/lib/utils/dates";

async function fetchDashboardData(workspaceId: string) {
  const [recentPosts, scheduledPosts, trendingPosts, totalPosts, scheduledCount, publishedThisWeek, failedCount] =
    await Promise.all([
      prisma.post.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          confidence: true,
          scheduledAt: true,
          publishedAt: true,
          PostPlatform: { select: { platform: true, status: true, error: true } },
        },
      }),
      prisma.post.findMany({
        where: { workspaceId, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          PostPlatform: { select: { platform: true } },
        },
      }),
      prisma.redditTrendingPost.findMany({
        where: {
          workspaceId,
          scrapedAt: { gte: subHours(new Date(), 24) },
        },
        orderBy: [{ relevanceScore: "desc" }, { upvotes: "desc" }],
        take: 20,
      }),
      prisma.post.count({ where: { workspaceId } }),
      prisma.post.count({ where: { workspaceId, status: "SCHEDULED" } }),
      prisma.post.count({
        where: {
          workspaceId,
          status: "PUBLISHED",
          publishedAt: { gte: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })() },
        },
      }),
      prisma.post.count({ where: { workspaceId, status: "FAILED" } }),
    ]);

  const oneWeekAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  })();

  const [topPostAnalytics] = await prisma.analyticsSnapshot.findMany({
    where: {
      Post: {
        workspaceId,
        publishedAt: { gte: oneWeekAgo },
      },
    },
    orderBy: { engagementRate: "desc" },
    take: 1,
    include: {
      Post: { select: { id: true, title: true } },
    },
  });

  const topPost = topPostAnalytics
    ? {
        title: topPostAnalytics.Post.title ?? "Untitled",
        platform: topPostAnalytics.platform,
        engagementRate: topPostAnalytics.engagementRate ?? 0,
        likes: topPostAnalytics.likes,
        comments: topPostAnalytics.comments,
        shares: topPostAnalytics.shares,
      }
    : undefined;

  // Engagement data for sparkline (last 14 days)
  const engagementSnapshots = await prisma.analyticsSnapshot.findMany({
    where: {
      Post: {
        workspaceId,
        publishedAt: {
          gte: (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d; })(),
        },
      },
    },
    orderBy: { snapshotAt: "asc" },
    select: {
      snapshotAt: true,
      engagementRate: true,
    },
  });

  const engagementData = engagementSnapshots.map((s) => ({
    date: s.snapshotAt.toISOString(),
    engagementRate: s.engagementRate ?? 0,
  }));

  // Posting streak calculation
  const publishedPosts = await prisma.post.findMany({
    where: { workspaceId, status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });

  const { currentStreak, longestStreak, lastPostDate } = calculateStreak(publishedPosts.map((p) => p.publishedAt!).filter(Boolean));

  const consistencyScore = calculateConsistencyScore(publishedPosts);

  return {
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      confidence: p.confidence,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      platforms: p.PostPlatform.map((pl) => ({
        platform: pl.platform,
        status: pl.status,
        error: pl.error,
      })),
    })),
    scheduledPosts: scheduledPosts
      .filter((p) => p.scheduledAt != null)
      .map((p) => ({
        id: p.id,
        title: p.title,
        platforms: p.PostPlatform.map((pl) => pl.platform),
        scheduledAt: p.scheduledAt!.toISOString(),
      })),
    trendingPosts: trendingPosts.map((p) => ({
      id: p.id,
      subreddit: p.subreddit,
      title: p.title,
      url: p.url,
      author: p.author,
      upvotes: p.upvotes,
      commentCount: p.commentCount,
      relevanceScore: p.relevanceScore,
      relevanceReason: p.relevanceReason,
      isActionable: p.isActionable,
      topicTags: p.topicTags,
      suggestedAction: p.suggestedAction,
    })),
    insights: {
      topPost,
      trend: topPost
        ? { direction: "up" as const, metric: "Engagement rate", value: "+12%", period: "this week" }
        : undefined,
      recommendation: topPost
        ? "Video content is performing well on Instagram. Consider creating more behind-the-scenes content."
        : undefined,
    },
    quickStats: {
      totalPosts,
      scheduledCount,
      publishedThisWeek,
      failedCount,
    },
    engagementData,
    postingStreak: {
      currentStreak,
      longestStreak,
      consistencyScore,
      lastPostDate: lastPostDate?.toISOString() ?? null,
    },
  };
}

function calculateStreak(dates: Date[]) {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, lastPostDate: null };

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const lastPostDate = sorted[0];

  // Normalize to dates only (no time)
  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const uniqueDays = new Set(sorted.map(toDay));
  const dayArray = Array.from(uniqueDays).sort((a, b) => b - a);

  // Current streak
  const today = toDay(new Date());
  const yesterday = today - 86400000;
  let currentStreak = 0;
  if (dayArray[0] === today || dayArray[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < dayArray.length; i++) {
      if (dayArray[i] === dayArray[i - 1] - 86400000) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dayArray.length; i++) {
    if (dayArray[i] === dayArray[i - 1] - 86400000) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak, lastPostDate };
}

function calculateConsistencyScore(publishedPosts: { publishedAt: Date | null }[]): number {
  if (publishedPosts.length === 0) return 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentPosts = publishedPosts.filter((p) => p.publishedAt && p.publishedAt >= thirtyDaysAgo);

  // Count unique days with posts in last 30 days
  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const uniqueDays = new Set(recentPosts.map((p) => toDay(p.publishedAt!)));

  // Target: at least 15 unique posting days in 30 = 100%
  const targetDays = 15;
  return Math.min(100, Math.round((uniqueDays.size / targetDays) * 100));
}

export default async function DashboardPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const userId = user?.id as string | undefined;
  const userName = (user?.name as string | undefined) ?? "there";

  if (!userId) {
    redirect("/login");
  }

  const onboardingDone = await isOnboardingComplete(userId);

  const workspaceId = user?.workspaceId as string | undefined;

  if (!workspaceId) {
    return (
      <div className="mx-auto max-w-3xl">
        <WorkedExampleEmptyState />
      </div>
    );
  }

  const [profile, connectedAccounts, preferences] = await Promise.all([
    prisma.userProfile.findUnique({ where: { workspaceId } }),
    prisma.connectedAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dashboardPreference.findUnique({ where: { workspaceId } }),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <WorkedExampleEmptyState />
      </div>
    );
  }

  const postCount = await prisma.post.count({ where: { workspaceId } });

  // Parse layout preferences
  const layout: WidgetLayout = (preferences?.layout as WidgetLayout | undefined) ?? DEFAULT_WIDGET_LAYOUT;

  const dashboardData = await fetchDashboardData(workspaceId);

  return (
    <div className="space-y-6">
      {/* Onboarding incomplete banner */}
      {!onboardingDone && (
        <OnboardingBanner />
      )}

      {/* Header row: Greeting + Customize button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground" suppressHydrationWarning>
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your social media today.
          </p>
        </div>
        <CustomizeDashboardDialogContainer
          layout={layout}
          trigger={
            <Button variant="outline" size="sm" className="hover-scale">
              <GearSix className="mr-1.5 size-4" weight="bold" />
              Customize
            </Button>
          }
        />
      </div>

      {/* Quick-action bar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="sm" asChild className="hover-scale">
          <a href="/compose">
            <PencilSimple className="mr-1.5 size-4" weight="bold" />
            Compose
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="hover-scale">
          <a href="/calendar">
            <Calendar className="mr-1.5 size-4" weight="bold" />
            Schedule
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="hover-scale">
          <a href="/analytics">
            <ChartBar className="mr-1.5 size-4" weight="bold" />
            Analyze
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="hover-scale">
          <a href="/reddit/trending">
            <MagnifyingGlass className="mr-1.5 size-4" weight="bold" />
            Research
          </a>
        </Button>
      </div>

      {/* No posts yet — show empty state with profile analysis */}
      {postCount === 0 ? (
        <div className="space-y-6">
          <AIComposePrompt />
          <StartingVerbs />
          <WidgetGrid
            layout={layout}
            data={{
              ...dashboardData,
              connectedAccounts: connectedAccounts.map((a) => ({
                id: a.id,
                platform: a.platform,
                platformUserId: a.platformUserId,
                status: a.status,
              })),
              profile: {
                tone: profile.tone,
                postTypes: profile.postTypes as Record<string, unknown> | null,
                audience: profile.audience as Record<string, unknown> | null,
                bio: profile.bio as Record<string, unknown> | null,
              },
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Widget Grid */}
          <WidgetGrid
            layout={layout}
            data={{
              ...dashboardData,
              connectedAccounts: connectedAccounts.map((a) => ({
                id: a.id,
                platform: a.platform,
                platformUserId: a.platformUserId,
                status: a.status,
              })),
              profile: {
                tone: profile.tone,
                postTypes: profile.postTypes as Record<string, unknown> | null,
                audience: profile.audience as Record<string, unknown> | null,
                bio: profile.bio as Record<string, unknown> | null,
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
