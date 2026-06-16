import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PencilSimple, Calendar, ChartBar, MagnifyingGlass, GearSix, Sparkle } from "@phosphor-icons/react/ssr";
import { StartingVerbs } from "@/components/dashboard/starting-verbs";
import { AIComposePrompt } from "@/components/dashboard/ai-compose-prompt";
import { WorkedExampleEmptyState } from "@/components/dashboard/worked-example-empty-state";
import { StaggerPage } from "@/components/ui/stagger-page";
import { BrandContextStatusBannerClient } from "@/components/dashboard/brand-context-status-banner-client";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { BrandLearningWidget } from "@/components/dashboard/brand-learning-widget";
import { WidgetGridDynamic } from "@/components/dashboard/widget-grid-dynamic";
import { CustomizeDialogV2Container } from "@/components/dashboard/customize-dialog-v2";
import type { WidgetLayout } from "@/lib/dashboard/widget-registry";
import { getDefaultLayoutForRole } from "@/lib/dashboard/widget-registry";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { UserRole } from "@/lib/role-guard";

export const revalidate = 60; // Cache for 60 seconds

async function fetchTier1DashboardData(workspaceId: string) {
  const [recentPosts, scheduledPosts, totalPosts, scheduledCount, publishedThisWeek, failedCount] =
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
        take: 50, // Limit to prevent unbounded queries
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          PostPlatform: { select: { platform: true } },
        },
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
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string; name?: string; role?: UserRole };
  const userId = user?.id as string | undefined;
  const userName = user?.name ?? "there";

  if (!userId) {
    redirect("/login");
  }

  // Resolve role with DB fallback
  let userRole = user?.role;
  if (!userRole && userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    userRole = dbUser?.role ?? 'FREE_USER';
  } else {
    userRole = userRole ?? 'FREE_USER';
  }

  const workspaceId = user?.workspaceId as string | undefined;

  if (!workspaceId) {
    return (
      <div className="mx-auto max-w-3xl">
        <WorkedExampleEmptyState />
      </div>
    );
  }

  const [userProfile, connectedAccounts, preferences, brandContext] = await Promise.all([
    prisma.userProfile.findUnique({ where: { workspaceId } }),
    prisma.connectedAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dashboardPreference.findUnique({ where: { workspaceId } }),
    prisma.brandContext.findUnique({
      where: { workspaceId },
      select: { trainingStatus: true, lastTrainedAt: true, businessName: true, tonePreset: true },
    }),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!userProfile) {
    return (
      <div className="mx-auto max-w-3xl">
        <WorkedExampleEmptyState />
      </div>
    );
  }

  // Parse layout preferences (use role-specific defaults)
  const layout: WidgetLayout = (preferences?.layout as WidgetLayout | undefined) ?? getDefaultLayoutForRole(userRole);

  const dashboardData = await fetchTier1DashboardData(workspaceId);
  const postCount = dashboardData.quickStats.totalPosts;

  // Compute onboarding progress
  const initialProgress = {
    steps: {
      about_you: !!brandContext?.businessName,
      connect_accounts: connectedAccounts.length > 0,
      brand_voice: !!brandContext?.tonePreset,
      first_post: postCount > 0,
    },
    completedCount: [
      !!brandContext?.businessName,
      connectedAccounts.length > 0,
      !!brandContext?.tonePreset,
      postCount > 0,
    ].filter(Boolean).length,
    allComplete: [
      !!brandContext?.businessName,
      connectedAccounts.length > 0,
      !!brandContext?.tonePreset,
      postCount > 0,
    ].every(Boolean),
  };

  return (
    <StaggerPage>
      {/* Setup checklist */}
      {!initialProgress.allComplete && (
        <SetupChecklist
          workspaceId={workspaceId}
          initialProgress={initialProgress}
          connectedPlatforms={connectedAccounts.map(a => a.platform)}
        />
      )}

      {/* Brand context status banner */}
      <BrandContextStatusBannerClient brandContext={brandContext} />

      {/* Header row: Greeting + Manage widgets button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" suppressHydrationWarning>
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your social media today.
          </p>
        </div>
        <CustomizeDialogV2Container
          layout={layout}
          trigger={
            <Button variant="outline" size="sm" className="hover-scale">
              <GearSix className="mr-1.5 size-4" weight="bold" />
              Manage Widgets
            </Button>
          }
        />
      </div>

      {/* Free user upgrade CTA */}
      {userRole === 'FREE_USER' && (
        <Card className="rounded-sm border-brand/30 bg-brand/5">
          <CardContent className="pt-6">
            <Sparkle className="size-8 text-brand mb-2" weight="fill" />
            <h3 className="text-lg font-semibold">Unlock AI-powered features</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate posts, get AI insights, and automate your social media.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/billing">Start your free trial</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
          <BrandLearningWidget />
          <WidgetGridDynamic
            layout={layout}
            data={{
              ...dashboardData,
              connectedAccounts: connectedAccounts.map((a) => ({
                id: a.id,
                platform: a.platform,
                platformUserId: a.platformUserId,
                status: a.status,
              })),
            }}
            userRole={userRole}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <BrandLearningWidget />
          {/* Widget Grid */}
          <WidgetGridDynamic
            layout={layout}
            data={{
              ...dashboardData,
              connectedAccounts: connectedAccounts.map((a) => ({
                id: a.id,
                platform: a.platform,
                platformUserId: a.platformUserId,
                status: a.status,
              })),
            }}
            userRole={userRole}
          />
        </div>
      )}
    </StaggerPage>
  );
}
