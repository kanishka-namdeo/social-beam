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
  brandContextDraft: Annotation<Record<string, unknown>>({
    default: () => ({}),
    reducer: (current, next) => ({ ...current, ...next }),
  }),
  platformContextsDraft: Annotation<Record<string, Record<string, unknown>>>({
    default: () => ({}),
    reducer: (current, next) => ({ ...current, ...next }),
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

// ---------------------------------------------------------------------------
// Brand Analyzer State (Phase 2 — Brand Context System)
// ---------------------------------------------------------------------------

export const BrandAnalyzerState = Annotation.Root({
  ...MessagesAnnotation.spec,
  workspaceId: Annotation<string>(),
  userId: Annotation<string>(),
  correlationId: Annotation<string>({
    default: () => "",
    reducer: (_c, n) => n,
  }),

  // Input
  websiteUrl: Annotation<string>({
    default: () => "",
    reducer: (_c, n) => n,
  }),
  brandDescription: Annotation<string>({
    default: () => "",
    reducer: (_c, n) => n,
  }),
  uploadedFiles: Annotation<string[]>({
    default: () => [],
    reducer: (c, n) => [...c, ...n],
  }),

  // Crawled content keyed by page path: { zone, weight, text }
  crawledContent: Annotation<Record<string, { page: string; zone: string; weight: number; text: string }>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Tier 1 — Brand context draft
  brandContextDraft: Annotation<Record<string, unknown>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Tier 2 — Platform contexts draft (platform key -> context fields)
  platformContextsDraft: Annotation<Record<string, Record<string, unknown>>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Validation sample posts
  samplePosts: Annotation<Array<{ platform: string; content: string }>>({
    default: () => [],
    reducer: (c, n) => [...c, ...n],
  }),

  // User feedback and confirmation
  userFeedback: Annotation<string>({
    default: () => "",
    reducer: (_c, n) => n,
  }),
  userConfirmed: Annotation<boolean>({
    default: () => false,
    reducer: (_c, n) => n,
  }),
  // Inline edits applied by user before confirming
  userEdits: Annotation<Partial<Record<string, unknown>>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Flow control
  currentStep: Annotation<string>({
    default: () => "collect",
    reducer: (_c, n) => n,
  }),

  // Connected account data (Phase 4)
  connectedPlatforms: Annotation<string[]>({
    default: () => [],
    reducer: (_c, n) => n,
  }),
  connectedAccountDetails: Annotation<Record<string, { platformUsername?: string; followerCount?: number }>>({
    default: () => ({}),
    reducer: (_c, n) => n,
  }),
  recentPostsByPlatform: Annotation<Record<string, Array<{ content: string; status: string }>>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Tool-loop guard
  __tool_loop_iteration: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),
  __debug_step_count: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),

  // Internal crawl tracking for SSE progress streaming
  __crawlPages: Annotation<string[]>({
    default: () => [],
    reducer: (c, n) => [...c, ...n],
  }),
  __crawlError: Annotation<string>({
    default: () => "",
    reducer: (_c, n) => n,
  }),

  // Pages selected by the LLM page selector
  __selectedPages: Annotation<string[]>({
    default: () => [],
    reducer: (_c, n) => n,
  }),
  // Total pages crawled before selection
  __totalPagesBefore: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),
});

export type BrandAnalyzerStateType = typeof BrandAnalyzerState.State;
