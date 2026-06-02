import { prisma } from '../lib/prisma';
import type { Prisma } from '../app/generated/prisma';
import { logger } from '../lib/logger';

interface BioData {
  name?: string;
  businessType?: string;
  industry?: string;
  goals?: string[];
  audienceDescription?: string;
}

interface AudienceData {
  demographics?: Record<string, unknown>;
  interests?: string[];
  painPoints?: string[];
}

interface PerPlatformEntry {
  tone?: string;
  adjustments?: string;
}

async function main() {
  logger.info('migration.brand_context.start');

  const [userProfiles, brandVoices] = await Promise.all([
    prisma.userProfile.findMany(),
    prisma.brandVoice.findMany(),
  ]);

  logger.info('migration.brand_context.found', {
    userProfiles: userProfiles.length,
    brandVoices: brandVoices.length,
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const errorLog: { workspaceId: string; error: string }[] = [];

  for (const profile of userProfiles) {
    try {
      const bio = (profile.bio ?? {}) as BioData;
      const audience = (profile.audience ?? {}) as AudienceData;

      const existingBrandContext = await prisma.brandContext.findUnique({
        where: { workspaceId: profile.workspaceId },
      });

      if (existingBrandContext) {
        logger.info('migration.brand_context.skipped_exists', {
          workspaceId: profile.workspaceId,
        });
        skipped++;
        continue;
      }

      const brandVoice = brandVoices.find(
        (bv) => bv.workspaceId === profile.workspaceId
      );

      const brandContext = await prisma.brandContext.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: profile.workspaceId,
          businessName: (bio.name as string) ?? null,
          industry: (bio.industry as string) ?? (bio.businessType as string) ?? null,
          productDesc: (bio.audienceDescription as string) ?? null,
          tonePreset: brandVoice?.tonePreset ?? (profile.tone as string) ?? null,
          voiceDescription: (brandVoice?.description as string) ?? null,
          voiceExamples: (brandVoice?.examples as Prisma.InputJsonValue) ?? undefined,
          demographics: (audience.demographics as Prisma.InputJsonValue) ?? undefined,
          interests: (audience.interests ?? []) as string[],
          painPoints: (audience.painPoints ?? []) as string[],
          goals: ((bio.goals as string[]) ?? []) as string[],
          trainingStatus: 'trained',
          lastTrainedAt: new Date(),
        },
      });

      logger.info('migration.brand_context.created', {
        workspaceId: profile.workspaceId,
        brandContextId: brandContext.id,
      });

      const perPlatform = brandVoice?.perPlatform as Record<string, PerPlatformEntry> | null;
      if (perPlatform) {
        for (const [platform, config] of Object.entries(perPlatform)) {
          await prisma.platformContext.create({
            data: {
              id: crypto.randomUUID(),
              brandContextId: brandContext.id,
              platform,
              platformTone: config.tone ?? null,
            },
          });
          logger.info('migration.platform_context.created', {
            brandContextId: brandContext.id,
            platform,
          });
        }
      }

      migrated++;
    } catch (err) {
      errors++;
      errorLog.push({
        workspaceId: profile.workspaceId,
        error: String(err),
      });
      logger.error('migration.brand_context.error', {
        workspaceId: profile.workspaceId,
        error: String(err),
      });
    }
  }

  logger.info('migration.brand_context.summary', {
    migrated,
    skipped,
    errors,
    errorLog: errors > 0 ? errorLog : undefined,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  logger.fatal('migration.brand_context.fatal', { error: String(err) });
  process.exit(1);
});
