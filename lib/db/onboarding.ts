import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

export async function getOrCreateSession(userId: string) {
  let session = await prisma.onboardingSession.findUnique({
    where: { userId },
  });

  if (!session) {
    logger.info('db.onboarding.session_created', { userId });
    session = await prisma.onboardingSession.create({
      data: {
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
  return prisma.onboardingSession.upsert({
    where: { userId },
    create: {
      userId,
      currentStep: 'completion',
      completedAt: new Date(),
      stepData: {},
    },
    update: {
      currentStep: 'completion',
      completedAt: new Date(),
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
    // Handle UserProfile fields
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

    // Upsert UserProfile if there are fields to update
    const hasUserProfileData = Object.keys(userProfileUpdateData).length > 0;
    if (hasUserProfileData) {
      await tx.userProfile.upsert({
        where: { workspaceId },
        create: {
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

    // Handle BrandVoice
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
            workspaceId,
            ...brandVoiceUpdateData,
          } as Prisma.BrandVoiceCreateInput,
          update: brandVoiceUpdateData,
        });
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

  const [userProfile, brandVoice] = await prisma.$transaction([
    prisma.userProfile.findUnique({
      where: { workspaceId },
    }),
    prisma.brandVoice.findUnique({
      where: { workspaceId },
    }),
  ]);

  const completedSteps: string[] = [];

  // Determine completed steps based on data presence
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

  // Build profile analysis object only if at least one field has data
  const profileAnalysis = hasProfileAnalysis
    ? {
        tone: userProfile?.tone ?? undefined,
        postTypes: userProfile?.postTypes ?? undefined,
        imageAnalysis: userProfile?.imageAnalysis ?? undefined,
      }
    : null;

  logger.info('db.onboarding.existing_data_loaded', {
    workspaceId,
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
      await prisma.userProfile.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          bio: data as unknown as Prisma.JsonObject,
        },
        update: {
          bio: data as unknown as Prisma.InputJsonObject,
        },
      });
      break;
    }

    case 'define_audience': {
      await prisma.userProfile.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          audience: data as unknown as Prisma.JsonObject,
        },
        update: {
          audience: data as unknown as Prisma.InputJsonObject,
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

      if (Object.keys(updateData).length > 0) {
        await prisma.userProfile.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            tone: updateData.tone as string | null | undefined,
            postTypes: updateData.postTypes as Prisma.InputJsonValue,
            imageAnalysis: updateData.imageAnalysis as Prisma.InputJsonValue,
          },
          update: updateData,
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
