import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

// ---------------------------------------------------------------------------
// Type definitions for self-healer state fields
// ---------------------------------------------------------------------------

export interface DOMSnapshot {
  scraperName: string;
  url: string;
  capturedAt: string;
  cssClasses: string[];
  textLabels: string[];
  elementCounts: Record<string, number>;
  fullText: string;
  screenshot?: string; // base64 data URL
}

export interface ScraperFailure {
  scraperName: string;
  selectorType: string;
  selector: string;
  expectedMatches: number;
  actualMatches: number;
  healthScore: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface DOMDiff {
  scraperName: string;
  changedSelectors: Array<{ oldSelector: string; newCandidate: string }>;
  removedSelectors: string[];
  newTextLabels: string[];
  missingTextLabels: string[];
  structuralChanges: string[];
}

export interface CodePatch {
  scraperName: string;
  filePath: string;
  oldCode: string;
  newCode: string;
  rationale: string;
  confidence: number; // 0-1
}

export interface VerificationResult {
  scraperName: string;
  verified: boolean;
  healthScore: number;
  message: string;
}

export const SelfHealerState = Annotation.Root({
  ...MessagesAnnotation.spec,
  scraperTarget: Annotation<string>({
    default: () => 'all',
    reducer: (_c, n) => n,
  }),
  currentStep: Annotation<string>({
    default: () => 'probe',
    reducer: (_c, n) => n,
  }),

  // DOM probe results per scraper
  domSnapshots: Annotation<Record<string, DOMSnapshot>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Failure detection results
  failures: Annotation<ScraperFailure[]>({
    default: () => [],
    reducer: (_c, n) => [..._c, ...n],
  }),

  // DOM analysis and diff results
  domDiff: Annotation<Record<string, DOMDiff>>({
    default: () => ({}),
    reducer: (c, n) => ({ ...c, ...n }),
  }),

  // Proposed fixes
  proposedFixes: Annotation<CodePatch[]>({
    default: () => [],
    reducer: (c, n) => [...c, ...n],
  }),

  // Applied fixes
  appliedFixes: Annotation<CodePatch[]>({
    default: () => [],
    reducer: (c, n) => [...c, ...n],
  }),

  // Verification results
  verificationResults: Annotation<VerificationResult[]>({
    default: () => [],
    reducer: (_c, n) => [..._c, ...n],
  }),

  // Retry tracking
  fixRetryCount: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),

  // Metadata
  runId: Annotation<string>({
    default: () => crypto.randomUUID(),
    reducer: (_c, n) => n,
  }),
  startTime: Annotation<number>({
    default: () => Date.now(),
    reducer: (_c, n) => n,
  }),
  workspaceId: Annotation<string>({
    default: () => '',
    reducer: (_c, n) => n,
  }),
  correlationId: Annotation<string>({
    default: () => '',
    reducer: (_c, n) => n,
  }),
  userId: Annotation<string>({
    default: () => '',
    reducer: (_c, n) => n,
  }),

  // Internal tracking
  __tool_loop_iteration: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),
  __debug_step_count: Annotation<number>({
    default: () => 0,
    reducer: (_c, n) => n,
  }),
});

export type SelfHealerStateType = typeof SelfHealerState.State;
