import { prisma } from '@/lib/prisma';
import type { Prisma, PlatformContext } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

export async function getOrCreateSession(userId: string) {
  let session = await prisma.onboardingSession.findUnique({
    where: { userId },
  });

  if (!session) {
    logger.info('db.onboarding.session_created', { userId });
    session = await prisma.onboardingSession.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        currentStep: 'greeting',
        stepData: {} as Prisma.JsonObject,
      },
    });
  }

  return session;
}

export async function updateSessionStep(
  userId: string,
  step: string,
  stepData?: Record<string, unknown>
): Promise<Awaited<ReturnType<typeof prisma.onboardingSession.update>>> {
  logger.debug('db.onboarding.step_updated', { userId, step });
  return prisma.onboardingSession.upsert({
    where: { userId },
    create: {
      id: crypto.randomUUID(),
      userId,
      currentStep: step,
      ...(stepData && { stepData: stepData as Prisma.JsonObject }),
    },
    update: {
      currentStep: step,
      ...(stepData && { stepData: stepData as unknown as Prisma.InputJsonObject }),
    },
  });
}

export async function markSessionComplete(userId: string) {
  logger.info('db.onboarding.complete', { userId });
  const existing = await prisma.onboardingSession.findUnique({ where: { userId } });
  
  if (existing) {
    return prisma.onboardingSession.update({
      where: { userId },
      data: {
        currentStep: 'completion',
        completedAt: new Date(),
      },
    });
  }
  
  return prisma.onboardingSession.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      currentStep: 'completion',
      completedAt: new Date(),
      stepData: {} as Prisma.InputJsonValue,
    },
  });
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const session = await prisma.onboardingSession.findUnique({
    where: { userId },
  });
  return session?.currentStep === 'completion' && session?.completedAt !== null;
}

export interface OnboardingSaveData {
  workspaceId: string;
  userInfo?: Record<string, unknown>;
  audienceProfile?: Record<string, unknown>;
  profileAnalysis?: Record<string, unknown>;
  brandVoiceProfile?: Record<string, unknown>;
}

export async function saveOnboardingData(data: OnboardingSaveData): Promise<void> {
  const { workspaceId, userInfo, audienceProfile, profileAnalysis, brandVoiceProfile } = data;

  const fieldsToSave: Record<string, boolean> = {
    userInfo: !!userInfo && Object.keys(userInfo).length > 0,
    audienceProfile: !!audienceProfile && Object.keys(audienceProfile).length > 0,
    profileAnalysis: !!profileAnalysis && Object.keys(profileAnalysis).length > 0,
    brandVoiceProfile: !!brandVoiceProfile && Object.keys(brandVoiceProfile).length > 0,
  };

  const savedFields: string[] = [];
  const skippedFields: string[] = [];

  for (const [field, shouldSave] of Object.entries(fieldsToSave)) {
    if (shouldSave) {
      savedFields.push(field);
    } else {
      skippedFields.push(field);
    }
  }

  logger.info('db.onboarding.data_saved', {
    workspaceId,
    fields: fieldsToSave,
    saved: savedFields,
    skipped: skippedFields,
  });

  await prisma.$transaction(async (tx) => {
    // === OLD MODEL WRITES (deprecated, kept for backward compatibility) ===
    const userProfileUpdateData: Prisma.UserProfileUpdateInput = {};

    if (fieldsToSave.userInfo) {
      userProfileUpdateData.bio = userInfo as unknown as Prisma.InputJsonObject;
    }

    if (fieldsToSave.audienceProfile) {
      userProfileUpdateData.audience = audienceProfile as unknown as Prisma.InputJsonObject;
    }

    if (fieldsToSave.profileAnalysis) {
      if (profileAnalysis?.tone) {
        userProfileUpdateData.tone = profileAnalysis.tone as string;
      }
      if (profileAnalysis?.postTypes) {
        userProfileUpdateData.postTypes = profileAnalysis.postTypes as unknown as Prisma.InputJsonObject;
      }
      if (profileAnalysis?.imageAnalysis) {
        userProfileUpdateData.imageAnalysis = profileAnalysis.imageAnalysis as unknown as Prisma.InputJsonObject;
      }
    }

    const hasUserProfileData = Object.keys(userProfileUpdateData).length > 0;
    if (hasUserProfileData) {
      await tx.userProfile.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          bio: userProfileUpdateData.bio as Prisma.InputJsonValue,
          tone: userProfileUpdateData.tone as string | null | undefined,
          postTypes: userProfileUpdateData.postTypes as Prisma.InputJsonValue,
          imageAnalysis: userProfileUpdateData.imageAnalysis as Prisma.InputJsonValue,
          audience: userProfileUpdateData.audience as Prisma.InputJsonValue,
        },
        update: userProfileUpdateData,
      });
    }

    if (fieldsToSave.brandVoiceProfile) {
      const bv = brandVoiceProfile as Record<string, unknown>;
      const brandVoiceUpdateData: Prisma.BrandVoiceUpdateInput = {};

      if (bv.tonePreset) {
        brandVoiceUpdateData.tonePreset = bv.tonePreset as string;
      }
      if (bv.description) {
        brandVoiceUpdateData.description = bv.description as string;
      }
      if (bv.examples) {
        brandVoiceUpdateData.examples = bv.examples as unknown as Prisma.InputJsonObject;
      }
      if (bv.perPlatform) {
        brandVoiceUpdateData.perPlatform = bv.perPlatform as unknown as Prisma.InputJsonObject;
      }

      if (Object.keys(brandVoiceUpdateData).length > 0) {
        await tx.brandVoice.upsert({
          where: { workspaceId },
          create: {
            id: crypto.randomUUID(),
            workspaceId,
            ...brandVoiceUpdateData,
          } as Prisma.BrandVoiceCreateInput,
          update: brandVoiceUpdateData,
        });
      }
    }

    // === NEW MODEL WRITES (BrandContext + PlatformContext) ===
    const brandContextData: Record<string, unknown> = {};

    if (fieldsToSave.userInfo) {
      const bio = userInfo as Record<string, unknown>;
      if (bio.name) brandContextData.businessName = bio.name;
      if (bio.businessType) brandContextData.industry = bio.businessType;
      if (bio.industry) brandContextData.industry = bio.industry;
      if (bio.audienceDescription) brandContextData.productDesc = bio.audienceDescription;
    }

    if (fieldsToSave.audienceProfile) {
      const aud = audienceProfile as Record<string, unknown>;
      if (aud.demographics) brandContextData.demographics = aud.demographics;
      if (aud.interests) brandContextData.interests = aud.interests;
      if (aud.painPoints) brandContextData.painPoints = aud.painPoints;
    }

    if (fieldsToSave.profileAnalysis) {
      if (profileAnalysis?.tone) {
        brandContextData.tonePreset = profileAnalysis.tone;
      }
    }

    if (fieldsToSave.brandVoiceProfile) {
      const bv = brandVoiceProfile as Record<string, unknown>;
      if (bv.tonePreset) brandContextData.tonePreset = bv.tonePreset;
      if (bv.description) brandContextData.voiceDescription = bv.description;
      if (bv.examples) brandContextData.voiceExamples = bv.examples;
    }

    const hasBrandContextData = Object.keys(brandContextData).length > 0;
    if (hasBrandContextData) {
      await tx.brandContext.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          ...(brandContextData.businessName ? { businessName: brandContextData.businessName as string } : {}),
          ...(brandContextData.industry ? { industry: brandContextData.industry as string } : {}),
          ...(brandContextData.productDesc ? { productDesc: brandContextData.productDesc as string } : {}),
          ...(brandContextData.tonePreset ? { tonePreset: brandContextData.tonePreset as string } : {}),
          ...(brandContextData.voiceDescription ? { voiceDescription: brandContextData.voiceDescription as string } : {}),
          ...(brandContextData.voiceExamples ? { voiceExamples: brandContextData.voiceExamples as Prisma.InputJsonValue } : {}),
          ...(brandContextData.demographics ? { demographics: brandContextData.demographics as Prisma.InputJsonValue } : {}),
          ...(brandContextData.interests ? { interests: brandContextData.interests as string[] } : {}),
          ...(brandContextData.painPoints ? { painPoints: brandContextData.painPoints as string[] } : {}),
          trainingStatus: 'trained',
          lastTrainedAt: new Date(),
        },
        update: {
          ...(brandContextData.businessName ? { businessName: brandContextData.businessName as string } : {}),
          ...(brandContextData.industry ? { industry: brandContextData.industry as string } : {}),
          ...(brandContextData.productDesc ? { productDesc: brandContextData.productDesc as string } : {}),
          ...(brandContextData.tonePreset ? { tonePreset: brandContextData.tonePreset as string } : {}),
          ...(brandContextData.voiceDescription ? { voiceDescription: brandContextData.voiceDescription as string } : {}),
          ...(brandContextData.voiceExamples ? { voiceExamples: brandContextData.voiceExamples as Prisma.InputJsonValue } : {}),
          ...(brandContextData.demographics ? { demographics: brandContextData.demographics as Prisma.InputJsonValue } : {}),
          ...(brandContextData.interests ? { interests: brandContextData.interests as string[] } : {}),
          ...(brandContextData.painPoints ? { painPoints: brandContextData.painPoints as string[] } : {}),
          trainingStatus: 'trained',
          lastTrainedAt: new Date(),
        },
      });

      // Handle perPlatform → PlatformContext records
      if (fieldsToSave.brandVoiceProfile) {
        const bv = brandVoiceProfile as Record<string, unknown>;
        const perPlatform = bv.perPlatform as Record<string, { tone?: string; adjustments?: string }> | undefined;
        if (perPlatform) {
          const brandContext = await tx.brandContext.findUnique({
            where: { workspaceId },
            select: { id: true },
          });

          if (brandContext) {
            for (const [platform, config] of Object.entries(perPlatform)) {
              await tx.platformContext.upsert({
                where: {
                  brandContextId_platform: {
                    brandContextId: brandContext.id,
                    platform,
                  },
                },
                create: {
                  id: crypto.randomUUID(),
                  brandContextId: brandContext.id,
                  platform,
                  ...(config.tone ? { platformTone: config.tone } : {}),
                },
                update: {
                  ...(config.tone ? { platformTone: config.tone } : {}),
                },
              });
            }
          }
        }
      }
    }
  });
}

// Step order for onboarding flow
const STEP_ORDER = [
  'greeting',
  'collect_info',
  'connect_accounts',
  'analyze_profile',
  'define_audience',
  'train_brand_voice',
  'completion',
] as const;

export interface ExistingOnboardingData {
  userInfo: Record<string, unknown> | null;
  audienceProfile: Record<string, unknown> | null;
  profileAnalysis: { tone?: string; postTypes?: unknown; imageAnalysis?: unknown } | null;
  brandVoiceProfile: Record<string, unknown> | null;
  completedSteps: string[];
}

export async function getExistingOnboardingData(workspaceId: string): Promise<ExistingOnboardingData> {
  logger.debug('db.onboarding.get_existing_data', { workspaceId });

  // Try new BrandContext first
  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    include: { PlatformContext: true },
  });

  if (brandContext) {
    logger.info('db.onboarding.existing_data_loaded', {
      workspaceId,
      source: 'brand_context',
    });

    return {
      userInfo: brandContext.businessName
        ? {
            name: brandContext.businessName,
            industry: brandContext.industry,
            audienceDescription: brandContext.productDesc,
          }
        : null,
      audienceProfile: brandContext.demographics || brandContext.interests?.length || brandContext.painPoints?.length
        ? {
            demographics: brandContext.demographics,
            interests: brandContext.interests,
            painPoints: brandContext.painPoints,
          }
        : null,
      profileAnalysis: brandContext.tonePreset
        ? { tone: brandContext.tonePreset }
        : null,
      brandVoiceProfile: brandContext.tonePreset || brandContext.voiceDescription
        ? {
            tonePreset: brandContext.tonePreset,
            description: brandContext.voiceDescription,
            examples: brandContext.voiceExamples,
            perPlatform: Object.fromEntries(
              brandContext.PlatformContext.map((pc: PlatformContext) => [
                pc.platform,
                { tone: pc.platformTone },
              ])
            ),
          }
        : null,
      completedSteps: brandContext.trainingStatus === 'trained'
        ? ['collect_info', 'define_audience', 'analyze_profile', 'train_brand_voice']
        : [],
    };
  }

  // Fall back to old models
  const [userProfile, brandVoice] = await prisma.$transaction([
    prisma.userProfile.findUnique({
      where: { workspaceId },
    }),
    prisma.brandVoice.findUnique({
      where: { workspaceId },
    }),
  ]);

  const completedSteps: string[] = [];

  if (userProfile?.bio && Object.keys(userProfile.bio as Record<string, unknown>).length > 0) {
    completedSteps.push('collect_info');
  }

  if (userProfile?.audience && Object.keys(userProfile.audience as Record<string, unknown>).length > 0) {
    completedSteps.push('define_audience');
  }

  const hasProfileAnalysis = userProfile?.tone ||
    (userProfile?.postTypes && Object.keys(userProfile.postTypes as Record<string, unknown>).length > 0) ||
    (userProfile?.imageAnalysis && Object.keys(userProfile.imageAnalysis as Record<string, unknown>).length > 0);

  if (hasProfileAnalysis) {
    completedSteps.push('analyze_profile');
  }

  if (brandVoice && (
    brandVoice.tonePreset ||
    brandVoice.description ||
    (brandVoice.examples as unknown[]).length > 0
  )) {
    completedSteps.push('train_brand_voice');
  }

  const profileAnalysis = hasProfileAnalysis
    ? {
        tone: userProfile?.tone ?? undefined,
        postTypes: userProfile?.postTypes ?? undefined,
        imageAnalysis: userProfile?.imageAnalysis ?? undefined,
      }
    : null;

  logger.info('db.onboarding.existing_data_loaded', {
    workspaceId,
    source: 'legacy_models',
    completedSteps,
    hasUserProfile: !!userProfile,
    hasBrandVoice: !!brandVoice,
  });

  return {
    userInfo: userProfile?.bio as Record<string, unknown> | null,
    audienceProfile: userProfile?.audience as Record<string, unknown> | null,
    profileAnalysis,
    brandVoiceProfile: brandVoice as Record<string, unknown> | null,
    completedSteps,
  };
}

export async function saveStepData(
  step: string,
  workspaceId: string,
  data: Record<string, unknown>
): Promise<void> {
  logger.info('db.onboarding.step_data_saved', {
    step,
    workspaceId,
    fields: Object.keys(data),
  });

  switch (step) {
    case 'collect_info': {
      // === OLD MODEL ===
      await prisma.userProfile.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          bio: data as unknown as Prisma.JsonObject,
        },
        update: {
          bio: data as unknown as Prisma.InputJsonObject,
        },
      });

      // === NEW MODEL ===
      const bio = data as Record<string, unknown>;
      await prisma.brandContext.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          ...(bio.name ? { businessName: bio.name as string } : {}),
          ...(bio.businessType ? { industry: bio.businessType as string } : {}),
          ...(bio.industry ? { industry: bio.industry as string } : {}),
          ...(bio.audienceDescription ? { productDesc: bio.audienceDescription as string } : {}),
        },
        update: {
          ...(bio.name ? { businessName: bio.name as string } : {}),
          ...(bio.businessType ? { industry: bio.businessType as string } : {}),
          ...(bio.industry ? { industry: bio.industry as string } : {}),
          ...(bio.audienceDescription ? { productDesc: bio.audienceDescription as string } : {}),
        },
      });
      break;
    }

    case 'define_audience': {
      // === OLD MODEL ===
      await prisma.userProfile.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          audience: data as unknown as Prisma.JsonObject,
        },
        update: {
          audience: data as unknown as Prisma.InputJsonObject,
        },
      });

      // === NEW MODEL ===
      const aud = data as Record<string, unknown>;
      await prisma.brandContext.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          ...(aud.demographics ? { demographics: aud.demographics as Prisma.InputJsonValue } : {}),
          ...(aud.interests ? { interests: aud.interests as string[] } : {}),
          ...(aud.painPoints ? { painPoints: aud.painPoints as string[] } : {}),
        },
        update: {
          ...(aud.demographics ? { demographics: aud.demographics as Prisma.InputJsonValue } : {}),
          ...(aud.interests ? { interests: aud.interests as string[] } : {}),
          ...(aud.painPoints ? { painPoints: aud.painPoints as string[] } : {}),
        },
      });
      break;
    }

    case 'analyze_profile': {
      const updateData: Prisma.UserProfileUpdateInput = {};

      if (data.tone) {
        updateData.tone = data.tone as string;
      }
      if (data.postTypes) {
        updateData.postTypes = data.postTypes as unknown as Prisma.InputJsonObject;
      }
      if (data.imageAnalysis) {
        updateData.imageAnalysis = data.imageAnalysis as unknown as Prisma.InputJsonObject;
      }

      // === OLD MODEL ===
      if (Object.keys(updateData).length > 0) {
        await prisma.userProfile.upsert({
          where: { workspaceId },
          create: {
            id: crypto.randomUUID(),
            workspaceId,
            tone: updateData.tone as string | null | undefined,
            postTypes: updateData.postTypes as Prisma.InputJsonValue,
            imageAnalysis: updateData.imageAnalysis as Prisma.InputJsonValue,
          },
          update: updateData,
        });
      }

      // === NEW MODEL ===
      if (data.tone) {
        await prisma.brandContext.upsert({
          where: { workspaceId },
          create: {
            id: crypto.randomUUID(),
            workspaceId,
            tonePreset: data.tone as string,
          },
          update: {
            tonePreset: data.tone as string,
          },
        });
      }
      break;
    }

    case 'train_brand_voice': {
      const updateData: Prisma.BrandVoiceUpdateInput = {};

      if (data.tonePreset) {
        updateData.tonePreset = data.tonePreset as string;
      }
      if (data.description) {
        updateData.description = data.description as string;
      }
      if (data.examples) {
        updateData.examples = data.examples as unknown as Prisma.InputJsonObject;
      }
      if (data.perPlatform) {
        updateData.perPlatform = data.perPlatform as unknown as Prisma.InputJsonObject;
      }

      // === OLD MODEL ===
      if (Object.keys(updateData).length > 0) {
        await prisma.brandVoice.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            ...updateData,
          } as Prisma.BrandVoiceCreateInput,
          update: updateData,
        });
      }

      // === NEW MODEL ===
      const bcUpdate: Record<string, unknown> = {};
      if (data.tonePreset) bcUpdate.tonePreset = data.tonePreset;
      if (data.description) bcUpdate.voiceDescription = data.description;
      if (data.examples) bcUpdate.voiceExamples = data.examples;

      if (Object.keys(bcUpdate).length > 0) {
        await prisma.brandContext.upsert({
          where: { workspaceId },
          create: {
            id: crypto.randomUUID(),
            workspaceId,
            ...(bcUpdate.tonePreset ? { tonePreset: bcUpdate.tonePreset as string } : {}),
            ...(bcUpdate.voiceDescription ? { voiceDescription: bcUpdate.voiceDescription as string } : {}),
            ...(bcUpdate.voiceExamples ? { voiceExamples: bcUpdate.voiceExamples as Prisma.InputJsonValue } : {}),
            trainingStatus: 'trained',
            lastTrainedAt: new Date(),
          },
          update: {
            ...(bcUpdate.tonePreset ? { tonePreset: bcUpdate.tonePreset as string } : {}),
            ...(bcUpdate.voiceDescription ? { voiceDescription: bcUpdate.voiceDescription as string } : {}),
            ...(bcUpdate.voiceExamples ? { voiceExamples: bcUpdate.voiceExamples as Prisma.InputJsonValue } : {}),
            trainingStatus: 'trained',
            lastTrainedAt: new Date(),
          },
        });

        // Handle perPlatform → PlatformContext
        if (data.perPlatform) {
          const perPlatform = data.perPlatform as Record<string, { tone?: string }>;
          const brandContext = await prisma.brandContext.findUnique({
            where: { workspaceId },
            select: { id: true },
          });

          if (brandContext) {
            for (const [platform, config] of Object.entries(perPlatform)) {
              await prisma.platformContext.upsert({
                where: {
                  brandContextId_platform: {
                    brandContextId: brandContext.id,
                    platform,
                  },
                },
                create: {
                  id: crypto.randomUUID(),
                  brandContextId: brandContext.id,
                  platform,
                  ...(config.tone ? { platformTone: config.tone } : {}),
                },
                update: {
                  ...(config.tone ? { platformTone: config.tone } : {}),
                },
              });
            }
          }
        }
      }
      break;
    }

    default:
      logger.warn('db.onboarding.unknown_step', { step, workspaceId });
      break;
  }
}

export function getNextIncompleteStep(completedSteps: string[]): string {
  for (const step of STEP_ORDER) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }
  return 'completion';
}
