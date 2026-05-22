import { type OnboardingStateType } from '../state';
import { AIMessage } from '@langchain/core/messages';
import { markSessionComplete } from '@/lib/db/onboarding';
import { createLogger } from '../logging';

const completionMessage = `🎉 **Onboarding Complete!**

Your SocialBeam workspace is now set up and ready to go. Here's what we've accomplished:

✅ **Collected your information** - We know your goals and audience
✅ **Connected your accounts** - Your social profiles are linked up
✅ **Analyzed your content** - We understand your style and voice

You're all set to start creating amazing content with AI. Let's head to your dashboard to begin!`;

export async function completionNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  if (state.userId) {
    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        await markSessionComplete(state.userId);
        logger.info('completionNode: session marked complete in DB');
        break;
      } catch (err) {
        retries++;
        if (retries > maxRetries) {
          logger.error('completionNode: DB update failed after retries', { error: String(err) });
        } else {
          logger.warn('completionNode: DB update failed, retrying', { retry: retries, error: String(err) });
        }
      }
    }
  }

  const accomplishments: string[] = [];
  if (Object.keys(state.userInfo ?? {}).length > 0) {
    accomplishments.push('Profile information collected');
  }
  if (state.audienceProfile) {
    accomplishments.push('Target audience defined');
  }
  const connectedCount = state.connectedAccounts.filter(a => a.status === 'connected').length;
  if (connectedCount > 0) {
    accomplishments.push(`${connectedCount} social account${connectedCount > 1 ? 's' : ''} connected`);
  }
  if (state.profileAnalysis) {
    accomplishments.push('Content profile analyzed');
  }
  if (state.brandVoiceProfile) {
    accomplishments.push('Brand voice trained');
  }
  if (accomplishments.length === 0) {
    accomplishments.push('Workspace created and ready');
  }

  return {
    completed: true,
    messages: [new AIMessage({ content: completionMessage })],
    currentStep: 'completion',
    uiComponent: {
      type: 'CompletionCelebration',
      props: {
        accomplishments,
        creditBalance: 10,
      },
    },
  };
}
