import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

export const OnboardingState = Annotation.Root({
  ...MessagesAnnotation.spec,
  userId: Annotation<string>(),
  workspaceId: Annotation<string>(),
  correlationId: Annotation<string>(),
  currentStep: Annotation<string>({
    default: () => 'greeting',
    reducer: (_current, next) => next,
  }),
  userInfo: Annotation<Record<string, unknown>>({
    default: () => ({}),
    reducer: (current, next) => ({ ...current, ...next }),
  }),
  connectedAccounts: Annotation<Array<{ platform: string; status: string }>>({
    default: () => [],
    reducer: (_current, next) => next,
  }),
  profileAnalysis: Annotation<Record<string, unknown> | null>({
    default: () => null,
    reducer: (_current, next) => next,
  }),
  uiComponent: Annotation<{ type: string; props: Record<string, unknown> } | null>({
    default: () => null,
    reducer: (_current, next) => next,
  }),
  uiComponents: Annotation<Array<{ type: string; props: Record<string, unknown> }>>({
    default: () => [],
    reducer: (current, next) => [...current, ...next],
  }),
  completed: Annotation<boolean>({
    default: () => false,
    reducer: (_current, next) => next,
  }),
  audienceProfile: Annotation<Record<string, unknown> | null>({
    default: () => null,
    reducer: (_current, next) => next,
  }),
  brandVoiceProfile: Annotation<Record<string, unknown> | null>({
    default: () => null,
    reducer: (_current, next) => next,
  }),
  hasExistingData: Annotation<boolean>({
    default: () => false,
    reducer: (_current, next) => next,
  }),
  __debug_step_count: Annotation<number>({
    default: () => 0,
    reducer: (_current, next) => next,
  }),
});

export type OnboardingStateType = typeof OnboardingState.State;
