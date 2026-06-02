import { getBrandContext } from "@/lib/db/brand-context";
import type { PlatformContext } from "@/app/generated/prisma";
import { logger } from "@/lib/logger";

export interface BrandContextForAI {
  brandSummary: string;
  identity: {
    businessName?: string;
    industry?: string;
    productDesc?: string;
    tagline?: string;
    websiteUrl?: string;
  };
  voice: {
    tonePreset?: string;
    voiceDescription?: string;
    bannedWords?: string[];
    voiceExamples?: unknown;
  };
  audience: {
    audienceType?: string;
    interests?: string[];
    painPoints?: string[];
    competitors?: string[];
    demographics?: unknown;
  };
  goals: string[];
  platforms: Record<string, {
    platformTone?: string;
    contentMix?: unknown;
    postingCadence?: string;
    hashtagStrategy?: unknown;
    visualStyle?: string;
    engagementStyle?: string;
    platformRules?: string[];
  }>;
}

export async function loadBrandContextForAI(workspaceId: string): Promise<BrandContextForAI | null> {
  const ctx = await getBrandContext(workspaceId);
  if (!ctx || ctx.trainingStatus === "untrained") {
    logger.debug("ai.brand_context.not_available", { workspaceId, reason: ctx ? ctx.trainingStatus : "not_found" });
    return null;
  }

  const parts = [ctx.businessName || "Unknown brand"];
  if (ctx.tagline) parts.push(ctx.tagline);
  if (ctx.industry) parts.push(ctx.industry);
  const brandSummary = parts.join(" — ");

  const platforms: BrandContextForAI["platforms"] = {};
  for (const pc of (ctx.PlatformContext as PlatformContext[])) {
    platforms[pc.platform] = {
      platformTone: pc.platformTone ?? undefined,
      contentMix: pc.contentMix ?? undefined,
      postingCadence: pc.postingCadence ?? undefined,
      hashtagStrategy: pc.hashtagStrategy ?? undefined,
      visualStyle: pc.visualStyle ?? undefined,
      engagementStyle: pc.engagementStyle ?? undefined,
      platformRules: pc.platformRules ?? [],
    };
  }

  const result: BrandContextForAI = {
    brandSummary,
    identity: {
      businessName: ctx.businessName ?? undefined,
      industry: ctx.industry ?? undefined,
      productDesc: ctx.productDesc ?? undefined,
      tagline: ctx.tagline ?? undefined,
      websiteUrl: ctx.websiteUrl ?? undefined,
    },
    voice: {
      tonePreset: ctx.tonePreset ?? undefined,
      voiceDescription: ctx.voiceDescription ?? undefined,
      bannedWords: ctx.bannedWords.length > 0 ? ctx.bannedWords : undefined,
      voiceExamples: ctx.voiceExamples ?? undefined,
    },
    audience: {
      audienceType: ctx.audienceType ?? undefined,
      interests: ctx.interests.length > 0 ? ctx.interests : undefined,
      painPoints: ctx.painPoints.length > 0 ? ctx.painPoints : undefined,
      competitors: ctx.competitors.length > 0 ? ctx.competitors : undefined,
      demographics: ctx.demographics ?? undefined,
    },
    goals: ctx.goals.length > 0 ? ctx.goals : [],
    platforms,
  };

  logger.debug("ai.brand_context.loaded", {
    workspaceId,
    hasPlatforms: Object.keys(platforms).length,
    hasGoals: result.goals.length,
    trainingStatus: ctx.trainingStatus,
  });

  return result;
}

export function formatBrandSystemPrompt(ctx: BrandContextForAI): string {
  const lines = [
    "You are analyzing content for the following brand:",
    "",
    `Brand: ${ctx.brandSummary}`,
  ];

  if (ctx.identity.productDesc) {
    lines.push(`Product/Service: ${ctx.identity.productDesc}`);
  }

  if (ctx.voice.tonePreset) {
    lines.push(`Voice/Tone: ${ctx.voice.tonePreset}`);
  }
  if (ctx.voice.voiceDescription) {
    lines.push(`Voice Details: ${ctx.voice.voiceDescription}`);
  }

  if (ctx.audience.interests?.length) {
    lines.push(`Audience Interests: ${ctx.audience.interests.join(", ")}`);
  }
  if (ctx.audience.painPoints?.length) {
    lines.push(`Audience Pain Points: ${ctx.audience.painPoints.join(", ")}`);
  }
  if (ctx.audience.competitors?.length) {
    lines.push(`Competitors: ${ctx.audience.competitors.join(", ")}`);
  }

  if (ctx.goals.length > 0) {
    lines.push(`Business Goals: ${ctx.goals.join(", ")}`);
  }

  if (ctx.voice.bannedWords?.length) {
    lines.push(`Banned Words (NEVER use): ${ctx.voice.bannedWords.join(", ")}`);
  }

  lines.push("");
  return lines.join("\n");
}

export function formatPlatformSystemPrompt(ctx: BrandContextForAI, platform: string): string {
  const platformCtx = ctx.platforms[platform];
  if (!platformCtx) return "";

  const lines = [`Platform-specific guidance for ${platform}:`];

  if (platformCtx.platformTone) {
    lines.push(`- Tone on ${platform}: ${platformCtx.platformTone}`);
  }
  if (platformCtx.postingCadence) {
    lines.push(`- Recommended cadence: ${platformCtx.postingCadence}`);
  }
  if (platformCtx.engagementStyle) {
    lines.push(`- Engagement style: ${platformCtx.engagementStyle}`);
  }
  if (platformCtx.visualStyle) {
    lines.push(`- Visual style: ${platformCtx.visualStyle}`);
  }
  if (platformCtx.platformRules?.length) {
    lines.push(`- Platform rules:`);
    for (const rule of platformCtx.platformRules) {
      lines.push(`  - ${rule}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
