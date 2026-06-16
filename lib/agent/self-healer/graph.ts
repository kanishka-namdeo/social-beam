/**
 * Self-Healer Agent Graph — LangGraph state machine for LinkedIn scraper self-healing.
 *
 * Flow:
 * __start__ -> domProbe -> failureDetector
 *                              |
 *                    (has failures?)
 *                     /           \
 *                   yes            no
 *                    |              |
 *                    v              v
 *              domAnalyzer -> fixGenerator -> fixApplier -> verification
 *                    ^                                              |
 *                    |                                    (verified?)
 *                    |                                     /       \
 *                   no          yes (retry < 3)           yes       no
 *                    |              |                      |         |
 *                    +--------------+                      v         v
 *                                                     report -> END  done
 */
import { StateGraph, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { SelfHealerState, type SelfHealerStateType } from './state';
import { domProbeNode } from './nodes/dom-probe-node';
import { failureDetectorNode } from './nodes/failure-detector-node';
import { domAnalyzerNode } from './nodes/dom-analyzer-node';
import { fixGeneratorNode } from './nodes/fix-generator-node';
import { fixApplierNode } from './nodes/fix-applier-node';
import { verificationNode } from './nodes/verification-node';
import { reportNode } from './nodes/report-node';
import { withDebugTrace, createRoutedRouter } from '../debug';
import { withTimeout, NodeTimeoutError } from '../timeout-guard';
import { logger } from '@/lib/logger';
import { AIMessage } from '@langchain/core/messages';

// Per-node timeout values (ms)
const DOM_PROBE_TIMEOUT_MS = 180_000; // 3 min — needs to probe multiple pages
const FAILURE_DETECTOR_TIMEOUT_MS = 30_000;
const DOM_ANALYZER_TIMEOUT_MS = 120_000;
const FIX_GENERATOR_TIMEOUT_MS = 120_000;
const FIX_APPLIER_TIMEOUT_MS = 60_000;
const VERIFICATION_TIMEOUT_MS = 180_000;
const REPORT_TIMEOUT_MS = 30_000;

/** Wrap a node with timeout that converts timeout errors into error-state returns */
function withNodeTimeout(
  label: string,
  nodeFn: (state: SelfHealerStateType) => Promise<Partial<SelfHealerStateType>>,
  timeoutMs: number,
): (state: SelfHealerStateType) => Promise<Partial<SelfHealerStateType>> {
  return async (state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> => {
    try {
      return await withTimeout(() => nodeFn(state), timeoutMs, label);
    } catch (err) {
      if (err instanceof NodeTimeoutError) {
        logger.warn('self-healer.node_timeout', { node: label, timeoutMs });
        return {
          currentStep: 'error',
          messages: [new AIMessage(
            `Self-healer timed out at step "${label}" after ${timeoutMs}ms.`,
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
      throw new Error('DATABASE_URL is required for SelfHealer PostgresSaver checkpointer');
    }
    checkpointer = PostgresSaver.fromConnString(databaseUrl);
    if (!checkpointerSetupComplete) {
      await checkpointer.setup();
      checkpointerSetupComplete = true;
    }
  }
  return checkpointer;
}

export async function shutdownCheckpointer(): Promise<void> {
  if (checkpointer) {
    try {
      // PostgresSaver doesn't have an explicit end() method, but we can
      // clear the reference to allow garbage collection of any internal state
      checkpointer = undefined;
      checkpointerSetupComplete = false;
      logger.info('self-healer.checkpointer.shutdown_complete');
    } catch (error) {
      logger.error('self-healer.checkpointer.shutdown_error', { error: String(error) });
    }
  }
}

function buildSelfHealerGraph() {
  // Wrap all nodes with debug tracing
  const debugDomProbe = withDebugTrace('domProbe', domProbeNode);
  const debugFailureDetector = withDebugTrace('failureDetector', failureDetectorNode);
  const debugDomAnalyzer = withDebugTrace('domAnalyzer', domAnalyzerNode);
  const debugFixGenerator = withDebugTrace('fixGenerator', fixGeneratorNode);
  const debugFixApplier = withDebugTrace('fixApplier', fixApplierNode);
  const debugVerification = withDebugTrace('verification', verificationNode);
  const debugReport = withDebugTrace('report', reportNode);

  // Wrap LLM-heavy nodes with timeouts
  const timeoutDomProbe = withNodeTimeout('domProbe', debugDomProbe, DOM_PROBE_TIMEOUT_MS);
  const timeoutDomAnalyzer = withNodeTimeout('domAnalyzer', debugDomAnalyzer, DOM_ANALYZER_TIMEOUT_MS);
  const timeoutFixGenerator = withNodeTimeout('fixGenerator', debugFixGenerator, FIX_GENERATOR_TIMEOUT_MS);
  const timeoutFixApplier = withNodeTimeout('fixApplier', debugFixApplier, FIX_APPLIER_TIMEOUT_MS);
  const timeoutVerification = withNodeTimeout('verification', debugVerification, VERIFICATION_TIMEOUT_MS);
  const timeoutReport = withNodeTimeout('report', debugReport, REPORT_TIMEOUT_MS);

  // Router: after failureDetector, check if there are failures needing analysis
  function routeAfterFailureDetector(state: SelfHealerStateType): string {
    if (state.currentStep === 'error') return 'report';
    if (state.currentStep === 'report') return 'report'; // All healthy
    // Check if there are critical or warning failures
    const hasActionableFailures = state.failures.some(
      f => f.severity === 'critical' || f.severity === 'warning'
    );
    return hasActionableFailures ? 'domAnalyzer' : 'report';
  }

  // Router: after verification, check if all verified or need retry
  function routeAfterVerification(state: SelfHealerStateType): string {
    if (state.currentStep === 'error') return 'report';
    if (state.currentStep === 'report') return 'report';

    const allVerified = state.verificationResults.length > 0
      && state.verificationResults.every(r => r.verified);

    if (allVerified) return 'report';

    // Not verified — check retry count
    const retryCount = state.fixRetryCount ?? 0;
    if (retryCount < 3) {
      return 'domAnalyzer'; // Retry
    }

    return 'report'; // Max retries exceeded
  }

  // Router: after fixGenerator, check if there are patches to apply
  function routeAfterFixGenerator(state: SelfHealerStateType): string {
    if (state.currentStep === 'error') return 'report';
    if (state.currentStep === 'report') return 'report';
    return state.proposedFixes.length > 0 ? 'fixApplier' : 'report';
  }

  const loggedRouteAfterFailureDetector = createRoutedRouter('routeAfterFailureDetector', routeAfterFailureDetector);
  const loggedRouteAfterVerification = createRoutedRouter('routeAfterVerification', routeAfterVerification);
  const loggedRouteAfterFixGenerator = createRoutedRouter('routeAfterFixGenerator', routeAfterFixGenerator);

  return new StateGraph(SelfHealerState)
    .addNode('domProbe', timeoutDomProbe)
    .addNode('failureDetector', debugFailureDetector)
    .addNode('domAnalyzer', timeoutDomAnalyzer)
    .addNode('fixGenerator', timeoutFixGenerator)
    .addNode('fixApplier', timeoutFixApplier)
    .addNode('verification', timeoutVerification)
    .addNode('report', timeoutReport)
    .addEdge('__start__', 'domProbe')
    .addEdge('domProbe', 'failureDetector')
    .addConditionalEdges('failureDetector', loggedRouteAfterFailureDetector, {
      domAnalyzer: 'domAnalyzer',
      report: 'report',
    })
    .addEdge('domAnalyzer', 'fixGenerator')
    .addConditionalEdges('fixGenerator', loggedRouteAfterFixGenerator, {
      fixApplier: 'fixApplier',
      report: 'report',
    })
    .addEdge('fixApplier', 'verification')
    .addConditionalEdges('verification', loggedRouteAfterVerification, {
      domAnalyzer: 'domAnalyzer',
      report: 'report',
    })
    .addEdge('report', END);
}

let graphPromise: ReturnType<typeof compileSelfHealerGraph> | undefined;

async function compileSelfHealerGraph() {
  const cp = await ensureCheckpointer();
  return buildSelfHealerGraph().compile({
    checkpointer: cp,
    interruptBefore: ['fixApplier'],
  });
}

export async function getSelfHealerGraph() {
  if (!graphPromise) {
    graphPromise = compileSelfHealerGraph();
  }
  return graphPromise;
}

export const selfHealerGraphPromise = getSelfHealerGraph();
