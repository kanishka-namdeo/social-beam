import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpsertBrandContextSchema = z.object({
  businessName: z.string().optional(),
  tagline: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  industry: z.string().optional(),
  productDesc: z.string().optional(),
  tonePreset: z.string().optional(),
  voiceDescription: z.string().optional(),
  bannedWords: z.array(z.string()).optional(),
  voiceExamples: z.unknown().optional(),
  audienceType: z.string().optional(),
  demographics: z.unknown().optional(),
  interests: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  trainingStatus: z.string().optional(),
});

const UpsertPlatformContextSchema = z.object({
  platformTone: z.string().optional(),
  contentMix: z.unknown().optional(),
  postingCadence: z.string().optional(),
  hashtagStrategy: z.unknown().optional(),
  visualStyle: z.string().optional(),
  engagementStyle: z.string().optional(),
  platformRules: z.array(z.string()).optional(),
});

export type UpsertBrandContextInput = z.infer<typeof UpsertBrandContextSchema>;
export type UpsertPlatformContextInput = z.infer<typeof UpsertPlatformContextSchema>;

export async function getBrandContext(workspaceId: string) {
  logger.debug('db.brand_context.get', { workspaceId });
  return prisma.brandContext.findUnique({
    where: { workspaceId },
    include: { platformContexts: true },
  });
}

export async function upsertBrandContext(
  workspaceId: string,
  data: UpsertBrandContextInput
) {
  const parsed = UpsertBrandContextSchema.parse(data);
  logger.info('db.brand_context.upsert', { workspaceId });

  // Snapshot before upsert for version history
  await snapshotBrandContext(workspaceId, 'manual_edit').catch(() => {});

  try {
    return await prisma.brandContext.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...parsed,
        voiceExamples: parsed.voiceExamples as Prisma.InputJsonValue | undefined,
        demographics: parsed.demographics as Prisma.InputJsonValue | undefined,
      },
      update: {
        ...parsed,
        voiceExamples: parsed.voiceExamples as Prisma.InputJsonValue | undefined,
        demographics: parsed.demographics as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('P2002')) {
      logger.warn('db.brand_context.conflict', { workspaceId });
    }
    logger.error('db.brand_context.upsert_error', {
      workspaceId,
      error: errorMessage,
    });
    throw error;
  }
}

export async function getPlatformContext(brandContextId: string, platform: string) {
  logger.debug('db.platform_context.get', { brandContextId, platform });
  return prisma.platformContext.findUnique({
    where: {
      brandContextId_platform: {
        brandContextId,
        platform,
      },
    },
  });
}

export async function upsertPlatformContext(
  brandContextId: string,
  platform: string,
  data: UpsertPlatformContextInput
) {
  const parsed = UpsertPlatformContextSchema.parse(data);
  logger.info('db.platform_context.upsert', { brandContextId, platform });

  try {
    return await prisma.platformContext.upsert({
      where: {
        brandContextId_platform: {
          brandContextId,
          platform,
        },
      },
      create: {
        brandContextId,
        platform,
        ...parsed,
        contentMix: parsed.contentMix as Prisma.InputJsonValue | undefined,
        hashtagStrategy: parsed.hashtagStrategy as Prisma.InputJsonValue | undefined,
      },
      update: {
        ...parsed,
        contentMix: parsed.contentMix as Prisma.InputJsonValue | undefined,
        hashtagStrategy: parsed.hashtagStrategy as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('P2002')) {
      logger.warn('db.platform_context.conflict', { brandContextId, platform });
    }
    logger.error('db.platform_context.upsert_error', {
      brandContextId,
      platform,
      error: errorMessage,
    });
    throw error;
  }
}

export async function getFullBrandContext(workspaceId: string) {
  logger.debug('db.brand_context.get_full', { workspaceId });
  return prisma.brandContext.findUnique({
    where: { workspaceId },
    include: { platformContexts: true },
  });
}

export async function deleteBrandContext(workspaceId: string) {
  logger.info('db.brand_context.delete', { workspaceId });
  await prisma.brandContext.delete({
    where: { workspaceId },
  });
}

export async function snapshotBrandContext(
  workspaceId: string,
  reason?: string,
) {
  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    include: { platformContexts: true },
  });

  if (!brandContext) {
    logger.warn('db.brand_context.snapshot_no_context', { workspaceId });
    return null;
  }

  const snapshot: Record<string, unknown> = {
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
    trainingStatus: brandContext.trainingStatus,
  };

  const platformSnapshot = brandContext.platformContexts.map((pc) => ({
    platform: pc.platform,
    platformTone: pc.platformTone,
    contentMix: pc.contentMix,
    postingCadence: pc.postingCadence,
    hashtagStrategy: pc.hashtagStrategy,
    visualStyle: pc.visualStyle,
    engagementStyle: pc.engagementStyle,
    platformRules: pc.platformRules,
  }));

  logger.info('db.brand_context.snapshot', { workspaceId, reason });

  return prisma.brandContextVersion.create({
    data: {
      brandContextId: brandContext.id,
      snapshot: snapshot as Prisma.InputJsonValue,
      changeReason: reason,
      platformSnapshot: platformSnapshot as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getBrandContextHistory(
  workspaceId: string,
  limit = 20,
) {
  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    select: { id: true },
  });

  if (!brandContext) {
    return [];
  }

  logger.debug('db.brand_context.history', { workspaceId, limit });

  return prisma.brandContextVersion.findMany({
    where: { brandContextId: brandContext.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function restoreBrandContext(
  workspaceId: string,
  versionId: string,
) {
  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    select: { id: true },
  });

  if (!brandContext) {
    throw new Error('No brand context found');
  }

  const version = await prisma.brandContextVersion.findFirst({
    where: { id: versionId, brandContextId: brandContext.id },
  });

  if (!version) {
    throw new Error('Version not found');
  }

  const snapshot = version.snapshot as Record<string, unknown>;

  logger.info('db.brand_context.restore', { workspaceId, versionId });

  await prisma.$transaction(async (tx) => {
    await tx.brandContext.update({
      where: { workspaceId },
      data: {
        businessName: snapshot.businessName as string | null,
        tagline: snapshot.tagline as string | null,
        websiteUrl: snapshot.websiteUrl as string | null,
        industry: snapshot.industry as string | null,
        productDesc: snapshot.productDesc as string | null,
        tonePreset: snapshot.tonePreset as string | null,
        voiceDescription: snapshot.voiceDescription as string | null,
        bannedWords: (snapshot.bannedWords as string[]) ?? [],
        voiceExamples: snapshot.voiceExamples as Prisma.InputJsonValue | undefined,
        audienceType: snapshot.audienceType as string | null,
        demographics: snapshot.demographics as Prisma.InputJsonValue | undefined,
        interests: (snapshot.interests as string[]) ?? [],
        painPoints: (snapshot.painPoints as string[]) ?? [],
        competitors: (snapshot.competitors as string[]) ?? [],
        goals: (snapshot.goals as string[]) ?? [],
        trainingStatus: (snapshot.trainingStatus as string) ?? 'untrained',
      },
    });

    if (version.platformSnapshot) {
      const platforms = version.platformSnapshot as Array<{
        platform: string;
        platformTone?: string;
        contentMix?: unknown;
        postingCadence?: string;
        hashtagStrategy?: unknown;
        visualStyle?: string;
        engagementStyle?: string;
        platformRules?: string[];
      }>;

      for (const pc of platforms) {
        await tx.platformContext.upsert({
          where: {
            brandContextId_platform: { brandContextId: brandContext.id, platform: pc.platform },
          },
          create: {
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
  });

  // Snapshot before restore for undo capability
  await snapshotBrandContext(workspaceId, 'restore_checkpoint');

  return true;
}
