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
    .addNode('brandAnalyzer', debugBrandAnalyzer)
    .addNode('platformAdapter', debugPlatformAdapter)
    .addNode('sampleGenerator', debugSampleGenerator)
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
  return buildBrandAnalyzerGraph().compile({ checkpointer: cp });
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
