import { type OnboardingStateType } from '../state';
import { createLogger } from '../logging';

const stepOrder = ['greeting', 'collect_info', 'connect_accounts', 'analyze_profile', 'define_audience', 'train_brand_voice', 'completion'];

export async function orchestratorNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const { currentStep } = state;
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex < 0) {
    logger.warn('orchestrator: invalid step', { currentStep });
    return {};
  }

  // If we have data for a step but are at that step, auto-advance to skip completed steps
  if (state.currentStep === 'collect_info' && Object.keys(state.userInfo || {}).length > 0) {
    logger.info('orchestrator: userInfo already exists, auto-advancing to connect_accounts', { userId: state.userId });
    return { currentStep: 'connect_accounts' };
  }
  if (state.currentStep === 'analyze_profile' && state.profileAnalysis != null) {
    logger.info('orchestrator: profileAnalysis already exists, auto-advancing to define_audience', { userId: state.userId });
    return { currentStep: 'define_audience' };
  }
  if (state.currentStep === 'define_audience' && state.audienceProfile != null) {
    logger.info('orchestrator: audienceProfile already exists, auto-advancing to train_brand_voice', { userId: state.userId });
    return { currentStep: 'train_brand_voice' };
  }
  if (state.currentStep === 'train_brand_voice' && state.brandVoiceProfile != null) {
    logger.info('orchestrator: brandVoiceProfile already exists, auto-advancing to completion', { userId: state.userId });
    return { currentStep: 'completion' };
  }

  // Pure router — step nodes control advancement via interrupt()/resume()
  return {};
}
