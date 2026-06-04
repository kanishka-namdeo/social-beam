import { StateGraph, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { BrandAnalyzerState, type BrandAnalyzerStateType } from './state';
import { contextCollectorNode } from './nodes/brand-context-collector';
import { brandAnalyzerNode } from './nodes/brand-analyzer';
import { platformAdapterNode } from './nodes/brand-platform-adapter';
import { sampleGeneratorNode } from './nodes/brand-sample-generator';
import { contextWaitNode } from './nodes/brand-context-wait';
import { contextSaverNode } from './nodes/brand-context-saver';
import { withDebugTrace, createRoutedRouter } from './debug';
import { withTimeout, NodeTimeoutError } from './timeout-guard';
import { logger } from '@/lib/logger';
import { AIMessage } from '@langchain/core/messages';

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
  const debugBrandAnalyzer = withDebugTrace('brandAnalyzer', brandAnalyzerNode);
  const debugPlatformAdapter = withDebugTrace('platformAdapter', platformAdapterNode);
  const debugSampleGenerator = withDebugTrace('sampleGenerator', sampleGeneratorNode);
  const debugContextWait = withDebugTrace('contextWait', contextWaitNode);
  const debugContextSaver = withDebugTrace('contextSaver', contextSaverNode);

  // Wrap LLM-based nodes with timeout guards
  const timeoutBrandAnalyzer = withNodeTimeout('brandAnalyzer', debugBrandAnalyzer, BRAND_ANALYZER_TIMEOUT_MS);
  const timeoutPlatformAdapter = withNodeTimeout('platformAdapter', debugPlatformAdapter, PLATFORM_ADAPTER_TIMEOUT_MS);
  const timeoutSampleGenerator = withNodeTimeout('sampleGenerator', debugSampleGenerator, SAMPLE_GENERATOR_TIMEOUT_MS);

  // Router: after contextCollector, check for errors or proceed to analysis
  function routeAfterCollector(state: BrandAnalyzerStateType): string {
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
  const loggedRouteAfterAnalyzer = createRoutedRouter('routeAfterAnalyzer', routeAfterAnalyzer);
  const loggedRouteAfterPlatformAdapter = createRoutedRouter('routeAfterPlatformAdapter', routeAfterPlatformAdapter);
  const loggedRouteAfterGenerator = createRoutedRouter('routeAfterGenerator', routeAfterGenerator);
  const loggedRouteAfterWait = createRoutedRouter('routeAfterWait', routeAfterWait);

  return new StateGraph(BrandAnalyzerState)
    .addNode('contextCollector', debugContextCollector)
    .addNode('brandAnalyzer', timeoutBrandAnalyzer)
    .addNode('platformAdapter', timeoutPlatformAdapter)
    .addNode('sampleGenerator', timeoutSampleGenerator)
    .addNode('contextWait', debugContextWait)
    .addNode('contextSaver', debugContextSaver)
    .addNode('done', withDebugTrace('done', async () => ({})))
    .addEdge('__start__', 'contextCollector')
    .addConditionalEdges('contextCollector', loggedRouteAfterCollector, {
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
