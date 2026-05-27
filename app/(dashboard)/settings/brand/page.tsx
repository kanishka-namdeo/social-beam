import { auth } from "@/lib/auth";
import { getBrandContext } from "@/lib/db/brand-context";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrandContextCard } from "@/components/settings/brand-context-card";
import { BrandConversationalUI } from "@/components/settings/brand-conversational-ui";
import { BrandLearningCard } from "@/components/settings/brand-learning-card";
import { BrandOnboardingBannerClient } from "@/components/dashboard/brand-onboarding-banner-client";
import { BrandTestPanel } from "@/components/settings/brand-test-panel";
import { BrandHealthPanel } from "@/components/settings/brand-health-panel";

export default async function BrandSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; url?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (!workspaceId) {
    redirect("/login");
  }

  const [brandContext, connectedAccounts, resolvedSearchParams] = await Promise.all([
    getBrandContext(workspaceId),
    prisma.connectedAccount.findMany({
      where: { workspaceId, status: "connected" },
      select: { platform: true },
    }),
    searchParams,
  ]);

  const connectedPlatforms = connectedAccounts.map((a) => a.platform);

  const isReanalyzeMode = resolvedSearchParams.mode === "reanalyze";
  const initialUrl = resolvedSearchParams.url ?? "";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Brand Context
        </h1>
        <p className="text-sm text-muted-foreground">
          {brandContext
            ? "Your brand profile is set up. Re-analyze or edit your brand voice, audience, and platform strategy."
            : "Tell me about your brand and I'll set everything up — voice, audience, and platform strategy."}
        </p>
      </div>

      {brandContext && !isReanalyzeMode ? (
        <div className="space-y-6">
          <BrandContextCard brandContext={brandContext} />
          <BrandTestPanel connectedPlatforms={connectedPlatforms} />
          <BrandHealthPanel />
          <BrandLearningCard />
        </div>
      ) : (
        <div className="space-y-4">
          <BrandOnboardingBannerClient />
          <BrandConversationalUI
            initialUrl={initialUrl}
            isReanalyzeMode={isReanalyzeMode}
          />
        </div>
      )}
    </div>
  );
}
