import { auth } from "@/lib/auth";
import { getFullBrandContext, snapshotBrandContext } from "@/lib/db/brand-context";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Non-blocking snapshot before export
    snapshotBrandContext(workspaceId, "export").catch(() => {});

    const brandContext = await getFullBrandContext(workspaceId);
    if (!brandContext) {
      return NextResponse.json({ error: "No brand context to export" }, { status: 404 });
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      brandContext: {
        businessName: brandContext.businessName,
        tagline: brandContext.tagline,
        websiteUrl: brandContext.websiteUrl,
        industry: brandContext.industry,
        productDesc: brandContext.productDesc,
        tonePreset: brandContext.tonePreset,
        voiceDescription: brandContext.voiceDescription,
        bannedWords: brandContext.bannedWords,
        voiceExamples: brandContext.voiceExamples,
        audienceType: brandContext.audienceType,
        demographics: brandContext.demographics,
        interests: brandContext.interests,
        painPoints: brandContext.painPoints,
        competitors: brandContext.competitors,
        goals: brandContext.goals,
      },
      platformContexts: brandContext.PlatformContext.map((pc) => ({
        platform: pc.platform,
        platformTone: pc.platformTone,
        contentMix: pc.contentMix,
        postingCadence: pc.postingCadence,
        hashtagStrategy: pc.hashtagStrategy,
        visualStyle: pc.visualStyle,
        engagementStyle: pc.engagementStyle,
        platformRules: pc.platformRules,
      })),
    };

    log.info("api.brand_context.export.success", { workspaceId });

    return NextResponse.json({ data: exportData });
  } catch (err) {
    log.error("api.brand_context.export.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
