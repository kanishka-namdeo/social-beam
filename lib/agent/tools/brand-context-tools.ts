
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma";
import { logger } from "@/lib/logger";
import { snapshotBrandContext } from "@/lib/db/brand-context";
import { initializeFieldStates } from "@/lib/brand/learning-signal-aggregator";

const SaveFullBrandContextSchema = z.object({
  workspaceId: z.string().describe("The workspace ID to save brand context for"),
  // Tier 1 — Brand Context fields
  businessName: z.string().optional().describe("Business/brand name"),
  tagline: z.string().optional().describe("Brand tagline"),
  websiteUrl: z.string().optional().describe("Brand website URL"),
  industry: z.string().optional().describe("Industry category"),
  productDesc: z.string().optional().describe("Product/service description (2-3 sentences)"),
  tonePreset: z.string().optional().describe("Brand tone preset"),
  voiceDescription: z.string().optional().describe("Free-form brand voice description"),
  bannedWords: z.array(z.string()).optional().describe("Words/phrases never to use"),
  voiceExamples: z.array(z.object({
    text: z.string(),
    source: z.string().optional(),
  })).optional().describe("Sample posts or voice examples"),
  audienceType: z.string().optional().describe("b2b | b2c | both"),
  demographics: z.record(z.string(), z.unknown()).optional().describe("Audience demographics"),
  interests: z.array(z.string()).optional().describe("Topics the audience cares about"),
  painPoints: z.array(z.string()).optional().describe("Problems the brand solves"),
  competitors: z.array(z.string()).optional().describe("Competitor names/accounts"),
  goals: z.array(z.string()).optional().describe("Business goals"),
  // Tier 2 — Platform Contexts
  platformContexts: z.array(z.object({
    platform: z.string().describe("Platform name: instagram, facebook, x, linkedin, tiktok, pinterest"),
    platformTone: z.string().optional(),
    contentMix: z.record(z.string(), z.unknown()).optional(),
    postingCadence: z.string().optional(),
    hashtagStrategy: z.record(z.string(), z.unknown()).optional(),
    visualStyle: z.string().optional(),
    engagementStyle: z.string().optional(),
    platformRules: z.array(z.string()).optional(),
  })).optional().describe("Per-platform context overrides"),
});

export const saveFullBrandContextTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const parsed = SaveFullBrandContextSchema.parse(input);
    const { workspaceId, platformContexts, ...brandData } = parsed;

    logger.debug("tool.invoke", { toolName: "save_full_brand_context", workspaceId });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const brandContext = await tx.brandContext.upsert({
          where: { workspaceId },
          create: {
            id: crypto.randomUUID(),
            workspaceId,
            ...brandData,
            voiceExamples: brandData.voiceExamples as Prisma.InputJsonValue | undefined,
            demographics: brandData.demographics as Prisma.InputJsonValue | undefined,
            trainingStatus: "trained",
            lastTrainedAt: new Date(),
          },
          update: {
            ...brandData,
            voiceExamples: brandData.voiceExamples as Prisma.InputJsonValue | undefined,
            demographics: brandData.demographics as Prisma.InputJsonValue | undefined,
            trainingStatus: "trained",
            lastTrainedAt: new Date(),
          },
        });

        if (platformContexts && platformContexts.length > 0) {
          for (const pc of platformContexts) {
            await tx.platformContext.upsert({
              where: {
                brandContextId_platform: {
                  brandContextId: brandContext.id,
                  platform: pc.platform,
                },
              },
              create: {
                id: crypto.randomUUID(),
                brandContextId: brandContext.id,
                platform: pc.platform,
                platformTone: pc.platformTone,
                contentMix: pc.contentMix as Prisma.InputJsonValue | undefined,
                postingCadence: pc.postingCadence,
                hashtagStrategy: pc.hashtagStrategy as Prisma.InputJsonValue | undefined,
                visualStyle: pc.visualStyle,
                engagementStyle: pc.engagementStyle,
                platformRules: pc.platformRules ?? [],
              },
              update: {
                platformTone: pc.platformTone,
                contentMix: pc.contentMix as Prisma.InputJsonValue | undefined,
                postingCadence: pc.postingCadence,
                hashtagStrategy: pc.hashtagStrategy as Prisma.InputJsonValue | undefined,
                visualStyle: pc.visualStyle,
                engagementStyle: pc.engagementStyle,
                platformRules: pc.platformRules ?? [],
              },
            });
          }
        }

        return brandContext;
      });

      // Create first version snapshot for version history
      await snapshotBrandContext(workspaceId, "initial_analysis").catch((snapErr) => {
        logger.warn("tool.save_full_brand_context.snapshot_failed", {
          workspaceId,
          brandContextId: result.id,
          error: String(snapErr),
        });
      });

      // Initialize Kalman filter field states for confidence tracking
      await initializeFieldStates(result.id).catch((initErr) => {
        logger.warn("tool.save_full_brand_context.field_states_init_failed", {
          workspaceId,
          brandContextId: result.id,
          error: String(initErr),
        });
      });

      logger.info("tool.complete", {
        toolName: "save_full_brand_context",
        workspaceId,
        brandContextId: result.id,
        platformCount: platformContexts?.length ?? 0,
        duration: Date.now() - start,
      });

      return JSON.stringify({
        success: true,
        message: `Brand context saved with ${platformContexts?.length ?? 0} platform contexts`,
        brandContextId: result.id,
      });
    } catch (err) {
      logger.error("tool.error", {
        toolName: "save_full_brand_context",
        workspaceId,
        error: String(err),
      });
      return JSON.stringify({ error: `Failed to save brand context: ${err}` });
    }
  },
  {
    name: "save_full_brand_context",
    description: "Save the complete brand context (Tier 1) and all platform contexts (Tier 2) for a workspace in a single atomic transaction. Used after brand analysis confirmation.",
    schema: SaveFullBrandContextSchema,
  },
);
