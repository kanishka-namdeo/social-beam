import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { getBrandContext, snapshotBrandContext } from "@/lib/db/brand-context";

const ImportBrandContextSchema = z.object({
  businessName: z.string().max(200).trim().optional().nullable(),
  tagline: z.string().max(500).trim().optional().nullable(),
  websiteUrl: z.string().url().max(500).optional().nullable(),
  industry: z.string().max(100).trim().optional().nullable(),
  productDesc: z.string().max(2000).trim().optional().nullable(),
  tonePreset: z.string().max(50).trim().optional().nullable(),
  voiceDescription: z.string().max(2000).trim().optional().nullable(),
  bannedWords: z.array(z.string().max(50)).max(100).optional().default([]),
  voiceExamples: z.unknown().optional().nullable(),
  audienceType: z.string().max(50).trim().optional().nullable(),
  demographics: z.unknown().optional().nullable(),
  interests: z.array(z.string().max(100)).max(50).optional().default([]),
  painPoints: z.array(z.string().max(200)).max(50).optional().default([]),
  competitors: z.array(z.string().max(100)).max(50).optional().default([]),
  goals: z.array(z.string().max(200)).max(20).optional().default([]),
});

const PlatformContextSchema = z.object({
  platform: z.string(),
  platformTone: z.string().max(50).trim().optional().nullable(),
  contentMix: z.unknown().optional().nullable(),
  postingCadence: z.string().max(200).trim().optional().nullable(),
  hashtagStrategy: z.unknown().optional().nullable(),
  visualStyle: z.string().max(500).trim().optional().nullable(),
  engagementStyle: z.string().max(500).trim().optional().nullable(),
  platformRules: z.array(z.string().max(200)).max(50).optional().default([]),
});

const ImportSchema = z.object({
  version: z.string(),
  brandContext: ImportBrandContextSchema,
  platformContexts: z.array(PlatformContextSchema).max(10).optional().default([]),
});

export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid import data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { brandContext: bcData, platformContexts: platforms } = parsed.data;

    const existing = await getBrandContext(workspaceId);
    if (existing) {
      await snapshotBrandContext(workspaceId, "import").catch(() => {});
    }

    let brandContextFields = 0;
    for (const key of Object.keys(bcData) as (keyof typeof bcData)[]) {
      if (key === "voiceExamples" || key === "demographics") continue;
      const val = bcData[key];
      if (val !== null && val !== undefined) {
        brandContextFields++;
      }
    }

    const brandContext = await prisma.brandContext.upsert({
      where: { workspaceId },
      create: {
        id: crypto.randomUUID(),
        workspaceId,
        businessName: bcData.businessName ?? undefined,
        tagline: bcData.tagline ?? undefined,
        websiteUrl: bcData.websiteUrl ?? undefined,
        industry: bcData.industry ?? undefined,
        productDesc: bcData.productDesc ?? undefined,
        tonePreset: bcData.tonePreset ?? undefined,
        voiceDescription: bcData.voiceDescription ?? undefined,
        bannedWords: bcData.bannedWords,
        voiceExamples: bcData.voiceExamples ?? undefined,
        audienceType: bcData.audienceType ?? undefined,
        demographics: bcData.demographics ?? undefined,
        interests: bcData.interests,
        painPoints: bcData.painPoints,
        competitors: bcData.competitors,
        goals: bcData.goals,
        trainingStatus: "untrained",
      },
      update: {
        businessName: bcData.businessName ?? undefined,
        tagline: bcData.tagline ?? undefined,
        websiteUrl: bcData.websiteUrl ?? undefined,
        industry: bcData.industry ?? undefined,
        productDesc: bcData.productDesc ?? undefined,
        tonePreset: bcData.tonePreset ?? undefined,
        voiceDescription: bcData.voiceDescription ?? undefined,
        bannedWords: bcData.bannedWords,
        voiceExamples: bcData.voiceExamples ?? undefined,
        audienceType: bcData.audienceType ?? undefined,
        demographics: bcData.demographics ?? undefined,
        interests: bcData.interests,
        painPoints: bcData.painPoints,
        competitors: bcData.competitors,
        goals: bcData.goals,
      },
    });

    for (const pc of platforms) {
      await prisma.platformContext.upsert({
        where: {
          brandContextId_platform: { brandContextId: brandContext.id, platform: pc.platform },
        },
        create: {
          id: crypto.randomUUID(),
          brandContextId: brandContext.id,
          platform: pc.platform,
          platformTone: pc.platformTone ?? undefined,
          contentMix: pc.contentMix ?? undefined,
          postingCadence: pc.postingCadence ?? undefined,
          hashtagStrategy: pc.hashtagStrategy ?? undefined,
          visualStyle: pc.visualStyle ?? undefined,
          engagementStyle: pc.engagementStyle ?? undefined,
          platformRules: pc.platformRules,
        },
        update: {
          platformTone: pc.platformTone ?? undefined,
          contentMix: pc.contentMix ?? undefined,
          postingCadence: pc.postingCadence ?? undefined,
          hashtagStrategy: pc.hashtagStrategy ?? undefined,
          visualStyle: pc.visualStyle ?? undefined,
          engagementStyle: pc.engagementStyle ?? undefined,
          platformRules: pc.platformRules,
        },
      });
    }

    log.info("api.brand_context.import.success", {
      workspaceId,
      brandName: bcData.businessName,
      platformCount: platforms.length,
    });

    return NextResponse.json({
      success: true,
      imported: {
        brandContextFields,
        platformContexts: platforms.length,
      },
    });
  } catch (err) {
    log.error("api.brand_context.import.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
