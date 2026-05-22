import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/onboarding";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Sparkle, InstagramLogo, XLogo, LinkedinLogo, MetaLogo, TiktokLogo, PinterestLogo, Warning } from "@phosphor-icons/react/ssr";
import { RecentPostsList } from "@/components/dashboard/recent-posts-list";
import { AIInsightsCard } from "@/components/dashboard/ai-insights-card";
import { CalendarPreview } from "@/components/dashboard/calendar-preview";
import { AIStatusPanel } from "@/components/dashboard/ai-status-panel";
import { StartingVerbs } from "@/components/dashboard/starting-verbs";
import { WorkedExampleEmptyState } from "@/components/dashboard/worked-example-empty-state";
import { ProfileAnalysisCard } from "@/components/dashboard/profile-analysis-card";
import { TrendingRadarCard } from "@/components/reddit/trending-radar-card";

function subHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() - hours);
  return result;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-5" weight="fill" />,
  facebook: <MetaLogo className="size-5" weight="fill" />,
  x: <XLogo className="size-5" weight="fill" />,
  linkedin: <LinkedinLogo className="size-5" weight="fill" />,
  tiktok: <TiktokLogo className="size-5" weight="fill" />,
  pinterest: <PinterestLogo className="size-5" weight="fill" />,
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  expired: "secondary",
  revoked: "destructive",
  error: "destructive",
};

function ProfileAnalysisContent({ profile }: { profile: { tone?: string | null; postTypes?: Record<string, unknown> | null; audience?: Record<string, unknown> | null; bio?: Record<string, unknown> | null } }) {
  const toneLabels: Record<string, string> = {
    professional: "Professional",
    casual: "Casual",
    witty: "Witty",
    educational: "Educational",
    inspirational: "Inspirational",
    bold: "Bold",
  };

  const tone = profile.tone ? toneLabels[profile.tone] ?? profile.tone : null;
  const bio = profile.bio;
  const postTypes = profile.postTypes;
  const audience = profile.audience;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tone && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Brand Tone
          </p>
          <Badge variant="default" className="text-xs normal-case tracking-normal">
            {tone}
          </Badge>
        </div>
      )}
      {postTypes && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content Mix
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(postTypes).map(([type, value]) => (
              <Badge key={type} variant="outline" className="text-xs normal-case tracking-normal">
                {type}: {typeof value === "number" ? `${value}%` : String(value)}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {audience && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Audience
          </p>
          <p className="text-sm text-foreground">
            {Array.isArray(audience.interests)
              ? audience.interests.slice(0, 3).join(", ")
              : "Profiled"}
          </p>
        </div>
      )}
      {bio != null && bio.industry != null && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Industry
          </p>
          <p className="text-sm text-foreground">
            {String(bio.industry)}
          </p>
        </div>
      )}
    </div>
  );
}

async function DashboardWidgets({ workspaceId }: { workspaceId: string }) {
  const [recentPosts, scheduledPosts, trendingPosts] = await Promise.all([
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
        platforms: { select: { platform: true, status: true, error: true } },
      },
    }),
    prisma.post.findMany({
      where: { workspaceId, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        platforms: { select: { platform: true } },
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
  ]);

  const oneWeekAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  })();

  const [topPostAnalytics] = await prisma.analyticsSnapshot.findMany({
    where: {
      post: {
        workspaceId,
        publishedAt: { gte: oneWeekAgo },
      },
    },
    orderBy: { engagementRate: "desc" },
    take: 1,
    include: {
      post: { select: { id: true, title: true } },
    },
  });

  const topPost = topPostAnalytics
    ? {
        title: topPostAnalytics.post.title ?? "Untitled",
        platform: topPostAnalytics.platform,
        engagementRate: topPostAnalytics.engagementRate ?? 0,
        likes: topPostAnalytics.likes,
        comments: topPostAnalytics.comments,
        shares: topPostAnalytics.shares,
      }
    : undefined;

  const drafts = await prisma.post.findMany({
    where: { workspaceId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      createdAt: true,
      platforms: { select: { platform: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* AI Status Panel */}
      <AIStatusPanel
        agentActivity="Analyzing your content strategy"
        pendingReviews={
          drafts.length > 0
            ? drafts.map((d) => ({
                id: d.id,
                title: d.title ?? "Untitled",
                platforms: d.platforms.map((p) => p.platform),
                createdAt: d.createdAt.toISOString(),
              }))
            : []
        }
      />

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <RecentPostsList
            posts={recentPosts.map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              confidence: p.confidence,
              scheduledAt: p.scheduledAt?.toISOString() ?? null,
              publishedAt: p.publishedAt?.toISOString() ?? null,
              platforms: p.platforms.map((pl) => ({
                platform: pl.platform,
                status: pl.status,
                error: pl.error,
              })),
            }))}
          />

          <CalendarPreview
            posts={scheduledPosts
              .filter((p) => p.scheduledAt != null)
              .map((p) => ({
                id: p.id,
                title: p.title,
                platforms: p.platforms.map((pl) => pl.platform),
                scheduledAt: p.scheduledAt!.toISOString(),
              }))}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <AIInsightsCard
            topPost={topPost}
            trend={
              topPost
                ? { direction: "up", metric: "Engagement rate", value: "+12%", period: "this week" }
                : undefined
            }
            recommendation={
              topPost
                ? "Video content is performing well on Instagram. Consider creating more behind-the-scenes content."
                : undefined
            }
          />

          <TrendingRadarCard
            posts={trendingPosts.map((p) => ({
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
            }))}
          />
        </div>
      </div>
    </div>
  );
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

  const [profile, connectedAccounts] = await Promise.all([
    prisma.userProfile.findUnique({ where: { workspaceId } }),
    prisma.connectedAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    }),
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

  return (
    <div className="space-y-8">
      {/* Onboarding incomplete banner */}
      {!onboardingDone && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <Warning className="size-5 text-warning mt-0.5 shrink-0" weight="fill" />
          <div className="flex-1">
            <p className="font-medium">Onboarding incomplete</p>
            <p className="text-muted-foreground mt-1">
              You haven&apos;t finished setting up your AI assistant. Complete onboarding for a personalized experience.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => window.location.href = '/onboarding'}>
                Continue Onboarding
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                await fetch('/api/onboarding/skip', { method: 'POST' });
                window.location.reload();
              }}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your social media today.
        </p>
      </div>

      {/* No posts yet */}
      {postCount === 0 ? (
        <div className="space-y-6">
          <StartingVerbs />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkle className="size-5 text-brand" weight="fill" />
                Your Profile Analysis
              </CardTitle>
              <CardDescription>
                AI-generated insights from your onboarding session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileAnalysisContent profile={{
                tone: profile.tone,
                postTypes: profile.postTypes as Record<string, unknown> | null,
                audience: profile.audience as Record<string, unknown> | null,
                bio: profile.bio as Record<string, unknown> | null,
              }} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Widgets */}
          <DashboardWidgets workspaceId={workspaceId!} />

          <Separator />

          {/* Profile Analysis Card */}
          <ProfileAnalysisCard
            title="Profile Analysis"
            description="AI-generated insights from your onboarding session"
            profile={{
              tone: profile.tone,
              postTypes: profile.postTypes as Record<string, unknown> | null,
              audience: profile.audience as Record<string, unknown> | null,
              bio: profile.bio as Record<string, unknown> | null,
            }}
          />
        </div>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
          <CardDescription>
            Manage your social media integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No accounts connected yet
              </p>
              <Button variant="outline" size="sm">
                Connect an Account
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connectedAccounts.map((account: { id: string; platform: string; platformUserId: string; status: string }) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground" aria-hidden="true">
                      {platformIcons[account.platform] ?? "🔗"}
                    </span>
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">
                        {account.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.platformUserId}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={statusVariant[account.status] ?? "secondary"}
                    className="text-[0.625rem] normal-case tracking-normal"
                  >
                    {account.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversational Input */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="What do you want to post about?"
          className="flex-1 text-base"
        />
        <Button variant="default" size="default">
          Compose
          <ArrowRight className="ml-1" weight="bold" />
        </Button>
      </div>
    </div>
  );
}
