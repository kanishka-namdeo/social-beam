import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ComposeForm } from "@/components/compose/compose-form";
import { TrendContextBanner } from "@/components/compose/trend-context-banner";
import { BrandContextIndicator } from "@/components/compose/brand-context-indicator";

import type { UserRole } from "@/lib/role-guard";

function computeBrandSearchQuery(brandContext: {
  trainingStatus: string;
  industry: string | null;
  interests: string[];
  productDesc: string | null;
  PlatformContext: Array<{ visualStyle: string | null }>;
} | null): string {
  if (!brandContext || brandContext.trainingStatus !== "trained") return "";

  const parts: string[] = [];

  if (brandContext.industry) parts.push(brandContext.industry);
  if (brandContext.interests?.length) parts.push(brandContext.interests.slice(0, 3).join(" "));
  if (brandContext.productDesc) {
    const words = brandContext.productDesc.split(/\s+/).slice(0, 3).join(" ");
    parts.push(words);
  }

  const visualStyles = brandContext.PlatformContext
    .map((pc) => pc.visualStyle)
    .filter(Boolean)
    .slice(0, 2) as string[];
  if (visualStyles.length) parts.push(visualStyles.join(" "));

  return parts.join(" ").split(/\s+/).slice(0, 10).join(" ").trim();
}

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ trendId?: string; prompt?: string }>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string; role?: UserRole };
  const userId = user?.id as string | undefined;
  const workspaceId = user?.workspaceId as string;

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

  const [connectedAccounts, brandContext, workspaceData] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { workspaceId, status: "connected" },
      select: {
        platform: true,
        platformUsername: true,
        avatarUrl: true,
        followerCount: true,
      },
    }),
    prisma.brandContext.findUnique({
      where: { workspaceId },
      select: {
        businessName: true,
        tonePreset: true,
        trainingStatus: true,
        industry: true,
        interests: true,
        productDesc: true,
        PlatformContext: {
          select: { visualStyle: true },
        },
      },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        signatureEnabled: true,
        PostSignature: {
          select: {
            id: true,
            name: true,
            text: true,
            url: true,
            isDefault: true,
          },
        },
      },
    }),
  ]);

  const brandSearchQuery = computeBrandSearchQuery(brandContext);

  const resolvedParams = await searchParams;
  let trendContext = null;
  if (resolvedParams?.trendId) {
    const trend = await prisma.redditTrendingPost.findUnique({
      where: { id: resolvedParams.trendId, workspaceId },
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
    <div className="mx-auto max-w-4xl space-y-4">
      <BrandContextIndicator brandContext={brandContext} />
      {trendContext && <TrendContextBanner trend={trendContext} />}
      <ComposeForm
        connectedAccounts={connectedAccounts}
        initialPrompt={initialPrompt}
        userRole={userRole}
        brandSearchQuery={brandSearchQuery}
        signatures={workspaceData?.PostSignature ?? []}
        signatureEnabled={workspaceData?.signatureEnabled ?? true}
      />
    </div>
  );
}
