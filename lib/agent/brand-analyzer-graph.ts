import { StateGraph, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { BrandAnalyzerState, type BrandAnalyzerStateType } from './state';
import { contextCollectorNode } from './nodes/brand-context-collector';
import { brandPageSelectorNode } from './nodes/brand-page-selector';
import { brandAnalyzerNode } from './nodes/brand-analyzer';
import { platformAdapterNode } from './nodes/brand-platform-adapter';
import { sampleGeneratorNode } from './nodes/brand-sample-generator';
import { contextWaitNode } from './nodes/brand-context-wait';
import { contextSaverNode } from './nodes/brand-context-saver';
import { withDebugTrace, createRoutedRouter } from './debug';
import { withTimeout, NodeTimeoutError } from './timeout-guard';
import { logger } from '@/lib/logger';
import { AIMessage } from '@langchain/core/messages';
import { CHECKPOINT_MAP, saveCheckpoint } from './checkpoint-saver';
import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped thread ID storage using AsyncLocalStorage to prevent cross-request leaks
const threadIdStorage = new AsyncLocalStorage<{ threadId: string }>();

/**
 * Run a function within a request-scoped context for checkpoint thread ID.
 * The threadId will be available to all async code called within this context.
 */
export function runWithThreadId<T>(threadId: string, fn: () => Promise<T>): Promise<T> {
  return threadIdStorage.run({ threadId }, fn);
}

/**
 * @deprecated Use runWithThreadId instead. Kept for backward compatibility.
 */
export function setCurrentThreadIdForCheckpoint(threadId: string): void {
  // No-op: thread ID is now managed via AsyncLocalStorage
  // This function is kept temporarily for compatibility but does nothing
}

export function getCurrentThreadIdForCheckpoint(): string | undefined {
  const store = threadIdStorage.getStore();
  return store?.threadId;
}

// Per-node timeout values (ms)
// contextCollectorNode has its own 90s timeout inside the node
const BRAND_ANALYZER_TIMEOUT_MS = 120_000;
const PLATFORM_ADAPTER_TIMEOUT_MS = 60_000;
const SAMPLE_GENERATOR_TIMEOUT_MS = 90_000; // Increased from 30s — LLM sample generation routinely takes 50-60s

/** Wrap a node with timeout that converts timeout errors into error-state returns */
function withNodeTimeout(
  label: string,
  nodeFn: (state: BrandAnalyzerStateType) => Promise<Partial<BrandAnalyzerStateType>>,
  timeoutMs: number,
): (state: BrandAnalyzerStateType) => Promise<Partial<BrandAnalyzerStateType>> {
  return async (state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> => {
    try {
      return await withTimeout(() => nodeFn(state), timeoutMs, label);
    } catch (err) {
      if (err instanceof NodeTimeoutError) {
        logger.warn('agent.node_timeout', { node: label, timeoutMs });
        return {
          currentStep: 'error',
          messages: [new AIMessage(
            `Analysis took too long at step "${label}". This site may be too complex — try describing your brand instead.`,
          )],
        };
      }
      throw err;
    }
  };
}

/** Wrap a node to save a checkpoint after it completes (fire-and-forget) */
function withCheckpoint(
  label: string,
  nodeFn: (state: BrandAnalyzerStateType) => Promise<Partial<BrandAnalyzerStateType>>,
): (state: BrandAnalyzerStateType) => Promise<Partial<BrandAnalyzerStateType>> {
  const checkpoint = CHECKPOINT_MAP[label];
  if (!checkpoint) return nodeFn;

  return async (state: BrandAnalyzerStateType) => {
    const result = await nodeFn(state);
    if (result.currentStep === 'error') {
      return result;
    }

    // Merge state respecting array accumulator reducers — use the state
    // (which already has reduced values) as the base, then overlay non-array fields from result
    const mergedState: Partial<BrandAnalyzerStateType> = { ...state, ...result };

    // For array fields that use append reducers, the node's result only contains
    // new items, but the state already has the full accumulated list.
    // Preserve the full accumulated arrays from state.
    if (Array.isArray(state.samplePosts) && Array.isArray(result.samplePosts)) {
      mergedState.samplePosts = state.samplePosts;
    }
    if (Array.isArray(state.__crawlPages) && Array.isArray(result.__crawlPages)) {
      mergedState.__crawlPages = state.__crawlPages;
    }

    const threadId = getCurrentThreadIdForCheckpoint();
    if (threadId) {
      saveCheckpoint(mergedState as BrandAnalyzerStateType, checkpoint.checkpointStep, threadId).catch(() => {});
    }
    return result;
  };
}

let checkpointer: PostgresSaver | undefined;
let checkpointerSetupComplete = false;

async function ensureCheckpointer() {
  if (!checkpointer) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for PostgresSaver checkpointer');
    }
    checkpointer = PostgresSaver.fromConnString(databaseUrl);
    if (!checkpointerSetupComplete) {
      await checkpointer.setup();
      checkpointerSetupComplete = true;
    }
  }
  return checkpointer;
}

function buildBrandAnalyzerGraph() {
  const debugContextCollector = withDebugTrace('contextCollector', contextCollectorNode);
  const debugBrandPageSelector = withDebugTrace('brandPageSelector', brandPageSelectorNode);
  const debugBrandAnalyzer = withDebugTrace('brandAnalyzer', brandAnalyzerNode);
  const debugPlatformAdapter = withDebugTrace('platformAdapter', platformAdapterNode);
  const debugSampleGenerator = withDebugTrace('sampleGenerator', sampleGeneratorNode);
  const debugContextWait = withDebugTrace('contextWait', contextWaitNode);
  const debugContextSaver = withDebugTrace('contextSaver', contextSaverNode);

  // Wrap LLM-based nodes with timeout guards
  const timeoutBrandAnalyzer = withNodeTimeout('brandAnalyzer', debugBrandAnalyzer, BRAND_ANALYZER_TIMEOUT_MS);
  const timeoutPlatformAdapter = withNodeTimeout('platformAdapter', debugPlatformAdapter, PLATFORM_ADAPTER_TIMEOUT_MS);
  const timeoutSampleGenerator = withNodeTimeout('sampleGenerator', debugSampleGenerator, SAMPLE_GENERATOR_TIMEOUT_MS);

  // Router: after contextCollector, check for errors or proceed to page selection
  function routeAfterCollector(state: BrandAnalyzerStateType): string {
    if (state.currentStep === 'error') return 'done';
    return 'brandPageSelector';
  }

  // Router: after brandPageSelector, check for errors or proceed to analysis
  function routeAfterPageSelector(state: BrandAnalyzerStateType): string {
    if (state.currentStep === 'error') return 'done';
    return 'brandAnalyzer';
  }

  // Router: after brandAnalyzer, check for errors
  function routeAfterAnalyzer(state: BrandAnalyzerStateType): string {
    if (state.currentStep === 'error') return 'done';
    return 'platformAdapter';
  }

  // Router: after platformAdapter, check for errors
  function routeAfterPlatformAdapter(state: BrandAnalyzerStateType): string {
    if (state.currentStep === 'error') return 'done';
    return 'sampleGenerator';
  }

  // Router: after sampleGenerator, check for errors
  function routeAfterGenerator(state: BrandAnalyzerStateType): string {
    if (state.currentStep === 'error') return 'done';
    return 'contextWait';
  }

  // Router: after contextWait, route based on user response
  function routeAfterWait(state: BrandAnalyzerStateType): string {
    if (state.userConfirmed) return 'contextSaver';
    if (state.userFeedback && state.userFeedback.length > 0) return 'brandAnalyzer';
    return 'done';
  }

  const loggedRouteAfterCollector = createRoutedRouter('routeAfterCollector', routeAfterCollector);
  const loggedRouteAfterPageSelector = createRoutedRouter('routeAfterPageSelector', routeAfterPageSelector);
  const loggedRouteAfterAnalyzer = createRoutedRouter('routeAfterAnalyzer', routeAfterAnalyzer);
  const loggedRouteAfterPlatformAdapter = createRoutedRouter('routeAfterPlatformAdapter', routeAfterPlatformAdapter);
  const loggedRouteAfterGenerator = createRoutedRouter('routeAfterGenerator', routeAfterGenerator);
  const loggedRouteAfterWait = createRoutedRouter('routeAfterWait', routeAfterWait);

  return new StateGraph(BrandAnalyzerState)
    .addNode('contextCollector', withCheckpoint('contextCollector', debugContextCollector))
    .addNode('brandPageSelector', withCheckpoint('brandPageSelector', debugBrandPageSelector))
    .addNode('brandAnalyzer', withCheckpoint('brandAnalyzer', timeoutBrandAnalyzer))
    .addNode('platformAdapter', withCheckpoint('platformAdapter', timeoutPlatformAdapter))
    .addNode('sampleGenerator', withCheckpoint('sampleGenerator', timeoutSampleGenerator))
    .addNode('contextWait', withCheckpoint('contextWait', debugContextWait))
    .addNode('contextSaver', debugContextSaver)
    .addNode('done', withDebugTrace('done', async () => ({})))
    .addEdge('__start__', 'contextCollector')
    .addConditionalEdges('contextCollector', loggedRouteAfterCollector, {
      brandPageSelector: 'brandPageSelector',
      done: 'done',
    })
    .addConditionalEdges('brandPageSelector', loggedRouteAfterPageSelector, {
      brandAnalyzer: 'brandAnalyzer',
      done: 'done',
    })
    .addConditionalEdges('brandAnalyzer', loggedRouteAfterAnalyzer, {
      platformAdapter: 'platformAdapter',
      done: 'done',
    })
    .addConditionalEdges('platformAdapter', loggedRouteAfterPlatformAdapter, {
      sampleGenerator: 'sampleGenerator',
      done: 'done',
    })
    .addConditionalEdges('sampleGenerator', loggedRouteAfterGenerator, {
      contextWait: 'contextWait',
      done: 'done',
    })
    .addConditionalEdges('contextWait', loggedRouteAfterWait, {
      contextSaver: 'contextSaver',
      brandAnalyzer: 'brandAnalyzer',
      done: 'done',
    })
    .addEdge('contextSaver', 'done')
    .addEdge('done', END);
}

let graphPromise: ReturnType<typeof compileBrandAnalyzerGraph> | undefined;

async function compileBrandAnalyzerGraph() {
  const cp = await ensureCheckpointer();
  return buildBrandAnalyzerGraph().compile({
    checkpointer: cp,
    interruptBefore: ["contextWait"],
  });
}

export async function getBrandAnalyzerGraph() {
  if (!graphPromise) {
    graphPromise = compileBrandAnalyzerGraph();
  }
  return graphPromise;
}

export const brandAnalyzerGraphPromise = getBrandAnalyzerGraph();

export function getBrandAnalyzerGraphStructure(): {
  nodes: string[];
  edges: [string, string][];
  conditionals: { from: string; router: string; routes: string[] }[];
} {
  return {
    nodes: [
      'contextCollector',
      'brandPageSelector',
      'brandAnalyzer',
      'platformAdapter',
      'sampleGenerator',
      'contextWait',
      'contextSaver',
      'done',
    ],
    edges: [
      ['__start__', 'contextCollector'],
      ['contextSaver', 'done'],
      ['done', 'END'],
    ],
    conditionals: [
      {
        from: 'contextCollector',
        router: 'routeAfterCollector',
        routes: ['brandPageSelector', 'done'],
      },
      {
        from: 'brandPageSelector',
        router: 'routeAfterPageSelector',
        routes: ['brandAnalyzer', 'done'],
      },
      {
        from: 'brandAnalyzer',
        router: 'routeAfterAnalyzer',
        routes: ['platformAdapter', 'done'],
      },
      {
        from: 'platformAdapter',
        router: 'routeAfterPlatformAdapter',
        routes: ['sampleGenerator', 'done'],
      },
      {
        from: 'sampleGenerator',
        router: 'routeAfterGenerator',
        routes: ['contextWait', 'done'],
      },
      {
        from: 'contextWait',
        router: 'routeAfterWait',
        routes: ['contextSaver', 'brandAnalyzer', 'done'],
      },
    ],
  };
}
