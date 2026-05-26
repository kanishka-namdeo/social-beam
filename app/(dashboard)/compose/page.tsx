import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { ComposeForm } from "@/components/compose/compose-form";
import { TrendContextBanner } from "@/components/compose/trend-context-banner";
import { BrandContextIndicator } from "@/components/compose/brand-context-indicator";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ trendId?: string; prompt?: string }>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const [connectedAccounts, brandContext] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { workspaceId: user.workspaceId, status: "connected" },
      select: {
        platform: true,
        platformUsername: true,
        avatarUrl: true,
        followerCount: true,
      },
    }),
    prisma.brandContext.findUnique({
      where: { workspaceId: user.workspaceId },
      select: {
        businessName: true,
        tonePreset: true,
        trainingStatus: true,
      },
    }),
  ]);

  const resolvedParams = await searchParams;
  let trendContext = null;
  if (resolvedParams?.trendId) {
    const trend = await prisma.redditTrendingPost.findUnique({
      where: { id: resolvedParams.trendId, workspaceId: user.workspaceId },
    });
    if (trend) {
      trendContext = {
        id: trend.id,
        title: trend.title,
        subreddit: trend.subreddit,
        upvotes: trend.upvotes,
        commentCount: trend.commentCount,
        relevanceScore: trend.relevanceScore,
        relevanceReason: trend.relevanceReason,
        topicTags: trend.topicTags,
        suggestedAction: trend.suggestedAction,
        url: trend.url,
        sentiment: trend.sentiment,
        riskLevel: trend.riskLevel,
        riskReason: trend.riskReason,
      };
    }
  }

  const initialPrompt = trendContext
    ? `Write a post about: ${trendContext.title}. Context: ${trendContext.relevanceReason ?? ""}. Suggested hashtags: ${(trendContext.topicTags ?? []).slice(0, 5).join(", ")}`
    : resolvedParams?.prompt ?? undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <BrandContextIndicator brandContext={brandContext} />
      {trendContext && <TrendContextBanner trend={trendContext} />}
      <ComposeForm
        connectedAccounts={connectedAccounts}
        initialPrompt={initialPrompt}
      />
    </div>
  );
}
