import { StateGraph, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { OnboardingState, type OnboardingStateType } from './state';
import { orchestratorNode } from './nodes/orchestrator';
import { greetingNode } from './nodes/greeting';
import { userInfoCollectorNode, userInfoCollectorWait } from './nodes/user-info-collector';
import { audienceCollectorNode, audienceCollectorWait, audienceCollectorTools } from './nodes/audience-collector';
import { accountConnectorModel, accountConnectorWait, accountConnectorTools } from './nodes/account-connector';
import { profileAnalyzerNode } from './nodes/profile-analyzer';
import { brandVoiceNode, brandVoiceWait } from './nodes/brand-voice';
import { completionNode } from './nodes/completion';
import { logger } from '@/lib/logger';
import { withDebugTrace, createRoutedRouter, generateMermaidDiagram } from './debug';

let checkpointer: PostgresSaver | undefined;
let checkpointerSetupComplete = false;
let graphPromise: ReturnType<typeof compileGraph> | undefined;

function routeFromOrchestrator(state: OnboardingStateType): string {
  const step = state.currentStep;
  switch (step) {
    case 'greeting':
      return 'greetingHandler';
    case 'collect_info':
      return 'userInfoCollector';
    case 'connect_accounts':
      return 'accountConnectorModel';
    case 'analyze_profile':
      return 'profileAnalyzer';
    case 'define_audience':
      return 'audienceCollector';
    case 'train_brand_voice':
      return 'brandVoice';
    case 'completion':
      return 'completion';
    default:
      return 'completion';
  }
}

/** Route after audience collector: if tool calls pending, go to tools; otherwise wait for user */
function routeAfterAudienceCollector(state: OnboardingStateType): string {
  const msgs = state.messages;
  const lastMsg = msgs[msgs.length - 1] as unknown as Record<string, unknown>;
  const hasToolCalls = Array.isArray(lastMsg?.tool_calls)
    && (lastMsg.tool_calls as unknown[]).length > 0;

  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0;
  const maxIterations = 10;
  if (iteration >= maxIterations) {
    logger.warn('agent.tool_loop_guard_triggered', { node: 'audienceCollector', iterations: iteration, maxIterations });
    return 'audienceCollectorWait';
  }

  if (hasToolCalls) return 'audienceCollectorTools';
  return 'audienceCollectorWait';
}

/** Route after account connector: if tool calls pending, go to tools; otherwise wait for user */
function routeAfterAccountConnector(state: OnboardingStateType): string {
  const msgs = state.messages;
  const lastMsg = msgs[msgs.length - 1] as unknown as Record<string, unknown>;
  const hasToolCalls = Array.isArray(lastMsg?.tool_calls)
    && (lastMsg.tool_calls as unknown[]).length > 0;

  // Tool-loop guard: force exit if max iterations exceeded
  const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number) ?? 0;
  const maxIterations = 10;
  if (iteration >= maxIterations) {
    logger.warn('agent.tool_loop_guard_triggered', { iterations: iteration, maxIterations });
    return 'accountConnectorWait';
  }

  if (hasToolCalls) return 'accountConnectorTools';
  return 'accountConnectorWait';
}

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

export async function setupCheckpointer(): Promise<void> {
  try {
    logger.info('agent.checkpointer.setup_start');
    await ensureCheckpointer();
    logger.info('agent.checkpointer.setup_complete');
  } catch (error) {
    logger.error('agent.checkpointer.setup_error', { error: String(error) });
  }
}

function buildWorkflow() {
  // Wrap all nodes with debug tracing middleware
  const debugOrchestrator = withDebugTrace('orchestrator', orchestratorNode);
  const debugGreeting = withDebugTrace('greetingHandler', greetingNode);
  const debugUserInfoCollector = withDebugTrace('userInfoCollector', userInfoCollectorNode);
  const debugUserInfoCollectorWait = withDebugTrace('userInfoCollectorWait', userInfoCollectorWait);
  const debugAudienceCollector = withDebugTrace('audienceCollector', audienceCollectorNode);
  const debugAudienceCollectorWait = withDebugTrace('audienceCollectorWait', audienceCollectorWait);
  const debugAccountConnectorModel = withDebugTrace('accountConnectorModel', accountConnectorModel);
  const debugAccountConnectorWait = withDebugTrace('accountConnectorWait', accountConnectorWait);
  const debugProfileAnalyzer = withDebugTrace('profileAnalyzer', profileAnalyzerNode);
  const debugBrandVoice = withDebugTrace('brandVoice', brandVoiceNode);
  const debugBrandVoiceWait = withDebugTrace('brandVoiceWait', brandVoiceWait);
  const debugCompletion = withDebugTrace('completion', completionNode);

  // Wrap conditional routers with route logging
  const loggedRouteFromOrchestrator = createRoutedRouter('routeFromOrchestrator', routeFromOrchestrator);
  const loggedRouteAfterAccountConnector = createRoutedRouter('routeAfterAccountConnector', routeAfterAccountConnector);
  const loggedRouteAfterAudienceCollector = createRoutedRouter('routeAfterAudienceCollector', routeAfterAudienceCollector);

  return new StateGraph(OnboardingState)
    .addNode('orchestrator', debugOrchestrator)
    .addNode('greetingHandler', debugGreeting)
    .addNode('userInfoCollector', debugUserInfoCollector)
    .addNode('userInfoCollectorWait', debugUserInfoCollectorWait)
    .addNode('audienceCollector', debugAudienceCollector)
    .addNode('audienceCollectorWait', debugAudienceCollectorWait)
    .addNode('audienceCollectorTools', withDebugTrace('audienceCollectorTools', async (state) => {
      const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number ?? 0) + 1;
      const result = await audienceCollectorTools.invoke(state);
      return {
        ...(result as unknown as Partial<OnboardingStateType>),
        __tool_loop_iteration: iteration,
      };
    }))
    .addNode('accountConnectorModel', debugAccountConnectorModel)
    .addNode('accountConnectorTools', withDebugTrace('accountConnectorTools', async (state) => {
      // ToolNode is a class instance — we wrap invoke to get debug tracing
      // Track tool loop iteration count for runaway loop detection
      const iteration = ((state as Record<string, unknown>).__tool_loop_iteration as number ?? 0) + 1;
      const result = await accountConnectorTools.invoke(state);
      return {
        ...(result as unknown as Partial<OnboardingStateType>),
        __tool_loop_iteration: iteration,
      };
    }))
    .addNode('accountConnectorWait', debugAccountConnectorWait)
    .addNode('profileAnalyzer', debugProfileAnalyzer)
    .addNode('brandVoice', debugBrandVoice)
    .addNode('brandVoiceWait', debugBrandVoiceWait)
    .addNode('completion', debugCompletion)
    .addEdge('__start__', 'orchestrator')
    .addConditionalEdges('orchestrator', loggedRouteFromOrchestrator, {
      greetingHandler: 'greetingHandler',
      userInfoCollector: 'userInfoCollector',
      audienceCollector: 'audienceCollector',
      accountConnectorModel: 'accountConnectorModel',
      profileAnalyzer: 'profileAnalyzer',
      brandVoice: 'brandVoice',
      completion: 'completion',
    })
    // Collector steps: generate AI -> wait for user via interrupt -> orchestrator
    .addEdge('userInfoCollector', 'userInfoCollectorWait')
    .addEdge('userInfoCollectorWait', 'orchestrator')
    // Audience collector: generate AI -> if tool calls, execute tools and loop; otherwise wait for user
    .addConditionalEdges('audienceCollector', loggedRouteAfterAudienceCollector, {
      audienceCollectorTools: 'audienceCollectorTools',
      audienceCollectorWait: 'audienceCollectorWait',
    })
    .addEdge('audienceCollectorTools', 'audienceCollector')
    .addEdge('audienceCollectorWait', 'orchestrator')
    // Account connector: generate AI -> if tool calls, execute tools and loop; otherwise wait for user
    .addConditionalEdges('accountConnectorModel', loggedRouteAfterAccountConnector, {
      accountConnectorTools: 'accountConnectorTools',
      accountConnectorWait: 'accountConnectorWait',
    })
    .addEdge('accountConnectorTools', 'accountConnectorModel')
    .addEdge('accountConnectorWait', 'orchestrator')
    // Profile analyzer is non-interactive — runs to completion then advances
    .addEdge('profileAnalyzer', 'orchestrator')
    // Brand voice: generate AI -> wait for user via interrupt -> orchestrator
    .addEdge('brandVoice', 'brandVoiceWait')
    .addEdge('brandVoiceWait', 'orchestrator')
    .addEdge('completion', END)
    // Greeting: send welcome message then return to orchestrator for next step
    .addEdge('greetingHandler', 'orchestrator');
}

async function compileGraph() {
  const cp = await ensureCheckpointer();
  return buildWorkflow().compile({ checkpointer: cp });
}

export async function getOnboardingGraph() {
  if (!graphPromise) {
    graphPromise = compileGraph();
  }
  return graphPromise;
}

export const onboardingGraphPromise = getOnboardingGraph();

// ---------------------------------------------------------------------------
// Debug utilities exported for CLI / dev tooling
// ---------------------------------------------------------------------------

export function getGraphStructure(): {
  nodes: string[];
  edges: [string, string][];
  conditionals: { from: string; router: string; routes: string[] }[];
} {
  return {
    nodes: [
      'orchestrator',
      'greetingHandler',
      'userInfoCollector',
      'userInfoCollectorWait',
      'audienceCollector',
      'audienceCollectorWait',
      'audienceCollectorTools',
      'accountConnectorModel',
      'accountConnectorTools',
      'accountConnectorWait',
      'profileAnalyzer',
      'brandVoice',
      'brandVoiceWait',
      'completion',
    ],
    edges: [
      ['__start__', 'orchestrator'],
      ['userInfoCollector', 'userInfoCollectorWait'],
      ['userInfoCollectorWait', 'orchestrator'],
      ['audienceCollectorTools', 'audienceCollector'],
      ['audienceCollectorWait', 'orchestrator'],
      ['accountConnectorTools', 'accountConnectorModel'],
      ['accountConnectorWait', 'orchestrator'],
      ['profileAnalyzer', 'orchestrator'],
      ['brandVoice', 'brandVoiceWait'],
      ['brandVoiceWait', 'orchestrator'],
      ['completion', 'END'],
      ['greetingHandler', 'orchestrator'],
    ],
    conditionals: [
      {
        from: 'orchestrator',
        router: 'routeFromOrchestrator',
        routes: [
          'greetingHandler',
          'userInfoCollector',
          'accountConnectorModel',
          'profileAnalyzer',
          'audienceCollector',
          'brandVoice',
          'completion',
        ],
      },
      {
        from: 'audienceCollector',
        router: 'routeAfterAudienceCollector',
        routes: ['audienceCollectorTools', 'audienceCollectorWait'],
      },
      {
        from: 'accountConnectorModel',
        router: 'routeAfterAccountConnector',
        routes: ['accountConnectorTools', 'accountConnectorWait'],
      },
    ],
  };
}

export function getGraphMermaid(): string {
  return generateMermaidDiagram(getGraphStructure());
}
