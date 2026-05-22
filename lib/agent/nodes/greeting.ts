import { type OnboardingStateType } from '../state';
import { AIMessage } from '@langchain/core/messages';
import { createLogger } from '../logging';

const greetingMessage = `Welcome to **SocialBeam**! \U0001f44b

I'm here to help you set up your AI-powered social media workspace. We'll walk through a quick onboarding process to personalize everything for you.

Before we generate any content or planning, I need to understand your business and goals so everything is tailored to you. Here's what we'll do:

- \U0001f4cb First, I'll collect your basic information — name, business type, and industry
- \U0001f517 Then connect your social accounts
- \U0001f4ca Analyze your content profile
- \U0001f3af Define your target audience (optional)
- \U0001f3a8 Train your brand voice

Let's get started! What's your name?`;

/** Check if there's existing data to determine if this is a resume */
function hasExistingData(state: OnboardingStateType): boolean {
  return (
    state.hasExistingData === true ||
    Object.keys(state.userInfo || {}).length > 0 ||
    state.audienceProfile != null ||
    state.profileAnalysis != null ||
    state.brandVoiceProfile != null
  );
}

/** Determine the next step based on what data exists */
function determineNextStep(state: OnboardingStateType): string {
  if (Object.keys(state.userInfo || {}).length === 0) return 'collect_info';
  if (state.connectedAccounts.length === 0) return 'connect_accounts';
  if (state.profileAnalysis == null) return 'analyze_profile';
  if (state.audienceProfile == null) return 'define_audience';
  if (state.brandVoiceProfile == null) return 'train_brand_voice';
  return 'completion';
}

/** Build collected data summary for ResumeSummary component */
function buildCollectedData(state: OnboardingStateType): Record<string, unknown> {
  const userInfo = state.userInfo || {};
  const audience = state.audienceProfile as Record<string, unknown> || {};
  const brandVoice = state.brandVoiceProfile as Record<string, unknown> || {};

  return {
    name: userInfo.name,
    businessType: userInfo.business_type,
    industry: userInfo.industry,
    audience: userInfo.audience,
    goals: userInfo.goals,
    hasAudienceProfile: state.audienceProfile != null,
    audienceDemographics: audience.demographics,
    audienceInterests: audience.interests,
    hasProfileAnalysis: state.profileAnalysis != null,
    hasBrandVoice: state.brandVoiceProfile != null,
    voiceDescription: brandVoice.voiceDescription,
  };
}

export async function greetingNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('greetingNode: checking for existing data');

  // Check if we have existing data (resume scenario)
  const hasData = hasExistingData(state);

  if (hasData) {
    const nextStep = determineNextStep(state);
    const collectedData = buildCollectedData(state);
    const userName = (state.userInfo?.name as string) || 'there';

    logger.info('greetingNode: resuming onboarding with existing data', {
      nextStep,
      hasUserInfo: Object.keys(state.userInfo || {}).length > 0,
      hasAudience: state.audienceProfile != null,
      hasProfileAnalysis: state.profileAnalysis != null,
      hasBrandVoice: state.brandVoiceProfile != null,
    });

    const resumeMessage = `Welcome back, ${userName}! \U0001f44b

I've found your previous onboarding progress. Let me catch you up on what we've already collected, and then we can continue where you left off.`;

    return {
      messages: [new AIMessage({ content: resumeMessage })],
      currentStep: nextStep,
      uiComponent: {
        type: 'ResumeSummary',
        props: {
          title: 'Welcome back!',
          message: `Good to see you again, ${userName}! Here's what we already have on file:`,
          collectedData,
          nextStep,
        },
      },
    };
  }

  // Standard greeting for new users
  logger.info('greetingNode: sending standard greeting message');

  return {
    messages: [new AIMessage({ content: greetingMessage })],
    currentStep: 'collect_info',
    uiComponent: {
      type: 'StepIndicator',
      props: {
        currentStep: 1,
        totalSteps: 7,
        stepLabels: ['Welcome', 'Your Info', 'Audience', 'Connect', 'Analyze', 'Brand Voice', 'Complete'],
      },
    },
  };
}
