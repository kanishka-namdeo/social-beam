import type { OnboardingStateType } from './state';
import { logger as baseLogger, type AppLogger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Node execution tracing middleware
// ---------------------------------------------------------------------------

interface NodeTraceEntry {
  node: string;
  threadId: string;
  correlationId: string;
  userId: string;
  step: number;
  timestamp: string;
  durationMs?: number;
  error?: string;
  keysUpdated: string[];
  stateDiff?: { added: string[]; changed: string[]; removed: string[] };
}

const nodeTraces: Map<string, NodeTraceEntry[]> = new Map();

export function getTraceHistory(threadId: string): NodeTraceEntry[] {
  return nodeTraces.get(threadId) ?? [];
}

export function clearTraceHistory(threadId: string): void {
  nodeTraces.delete(threadId);
}

/**
 * Wrap a node function with debug tracing: logs enter/exit, computes state diff,
 * tracks timing, and records trace history per thread.
 */
export function withDebugTrace(
  nodeName: string,
  nodeFn: (state: OnboardingStateType) => Promise<Partial<OnboardingStateType>> | Partial<OnboardingStateType>,
) {
  return async function tracedNode(
    state: OnboardingStateType,
  ): Promise<Partial<OnboardingStateType>> {
    const threadId = resolveThreadId(state);
    const correlationId = state.correlationId ?? 'unknown';
    const userId = state.userId ?? 'unknown';

    const logger: AppLogger = baseLogger.child({
      node: nodeName,
      correlationId,
      userId,
      threadId,
    });

    const stepCount = resolveStepCount(state);
    const entry: NodeTraceEntry = {
      node: nodeName,
      threadId,
      correlationId,
      userId,
      step: stepCount,
      timestamp: new Date().toISOString(),
      keysUpdated: [],
    };

    logger.info('node.enter', { node: nodeName, step: stepCount, currentStep: state.currentStep });
    const startMs = Date.now();

    try {
      const result = await nodeFn(state);
      const durationMs = Date.now() - startMs;
      const stateDiff = computeStateDiff(
        stripInternalKeys(state),
        stripInternalKeys(result as Record<string, unknown>),
      );

      entry.durationMs = durationMs;
      entry.keysUpdated = Object.keys(result);
      entry.stateDiff = stateDiff;
      appendNodeTrace(threadId, entry);

      logStateDiff(logger, nodeName, stateDiff);

      logger.info('node.exit', {
        node: nodeName,
        step: stepCount,
        durationMs,
        keysUpdated: entry.keysUpdated,
        diffSummary: {
          added: stateDiff.added.length,
          changed: stateDiff.changed.length,
          removed: stateDiff.removed.length,
        },
      });

      return {
        ...result,
        __debug_step_count: stepCount + 1,
      };
    } catch (error) {
      const durationMs = Date.now() - startMs;
      entry.durationMs = durationMs;
      entry.error = String(error);
      appendNodeTrace(threadId, entry);

      logger.error('node.error', {
        node: nodeName,
        step: stepCount,
        durationMs,
        error: String(error),
      });

      throw error;
    }
  };
}

function resolveThreadId(state: OnboardingStateType): string {
  return (state as Record<string, unknown>).__langGraph_thread_id as string
    ?? (state as Record<string, unknown>).__thread_id as string
    ?? 'unknown';
}

function resolveStepCount(state: OnboardingStateType): number {
  return ((state as Record<string, unknown>).__debug_step_count as number) ?? 0;
}

function stripInternalKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('__') && key !== 'messages') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function appendNodeTrace(threadId: string, entry: NodeTraceEntry): void {
  const existing = nodeTraces.get(threadId) ?? [];
  existing.push(entry);
  nodeTraces.set(threadId, existing);
}

// ---------------------------------------------------------------------------
// State diff computation
// ---------------------------------------------------------------------------

export interface StateDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

export function computeStateDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): StateDiff {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diff: StateDiff = { added: [], changed: [], removed: [] };

  for (const key of allKeys) {
    if (key === 'messages' || key.startsWith('__')) continue;
    if (!(key in before)) {
      diff.added.push(key);
    } else if (!(key in after)) {
      diff.removed.push(key);
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff.changed.push(key);
    }
  }

  return diff;
}

function logStateDiff(logger: AppLogger, nodeName: string, diff: StateDiff): void {
  const parts: string[] = [];
  if (diff.added.length) parts.push(`+${diff.added.join(', ')}`);
  if (diff.changed.length) parts.push(`~${diff.changed.join(', ')}`);
  if (diff.removed.length) parts.push(`-${diff.removed.join(', ')}`);
  if (parts.length > 0) {
    logger.debug('node.state_diff', { node: nodeName, diff: parts.join(' | ') });
  }
}

// ---------------------------------------------------------------------------
// Routing logger decorator
// ---------------------------------------------------------------------------

export function createRoutedRouter(
  routerName: string,
  originalRouter: (state: OnboardingStateType) => string,
): (state: OnboardingStateType) => string {
  return (state: OnboardingStateType): string => {
    const correlationId = state.correlationId ?? 'unknown';
    const userId = state.userId ?? 'unknown';
    const logger: AppLogger = baseLogger.child({ correlationId, userId });

    const route = originalRouter(state);
    logger.debug('graph.route', { router: routerName, from: state.currentStep, to: route });

    return route;
  };
}

// ---------------------------------------------------------------------------
// Interrupt lifecycle tracking
// ---------------------------------------------------------------------------

interface InterruptEvent {
  type: 'interrupt' | 'resume' | 'timeout';
  node: string;
  threadId: string;
  correlationId: string;
  userId: string;
  step: string;
  timestamp: string;
  waitDurationMs?: number;
}

const interruptLog: InterruptEvent[] = [];

export function getInterruptLog(): InterruptEvent[] {
  return [...interruptLog];
}

export function logInterrupt(event: Omit<InterruptEvent, 'timestamp'>): void {
  interruptLog.push({ ...event, timestamp: new Date().toISOString() });
}

export function getAgentDebugReport(threadId?: string): {
  trace: NodeTraceEntry[];
  interrupts: InterruptEvent[];
  summary: {
    totalNodes: number;
    totalDurationMs: number;
    errorNodes: number;
    avgDurationMs: number;
  };
} {
  const trace = threadId ? getTraceHistory(threadId) : [...nodeTraces.values()].flat();
  const interrupts = threadId
    ? interruptLog.filter((e) => e.threadId === threadId)
    : interruptLog;

  const errorNodes = trace.filter((t) => t.error).length;
  const timedNodes = trace.filter((t) => t.durationMs !== undefined);
  const totalDurationMs = timedNodes.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const avgDurationMs = timedNodes.length > 0 ? totalDurationMs / timedNodes.length : 0;

  return {
    trace,
    interrupts,
    summary: {
      totalNodes: trace.length,
      totalDurationMs,
      errorNodes,
      avgDurationMs: Math.round(avgDurationMs),
    },
  };
}

// ---------------------------------------------------------------------------
// Graph visualization — Mermaid flowchart
// ---------------------------------------------------------------------------

interface GraphDef {
  nodes: string[];
  edges: [string, string][];
  conditionals: { from: string; router: string; routes: string[] }[];
}

export function generateMermaidDiagram(graph: GraphDef): string {
  const lines: string[] = ['graph TD'];

  for (const node of graph.nodes) {
    lines.push(`  ${node}[${node}]`);
  }

  for (const [from, to] of graph.edges) {
    lines.push(`  ${from} --> ${to}`);
  }

  for (const cond of graph.conditionals) {
    const diamondNode = `${cond.from}_router`;
    lines.push(`  ${diamondNode}{${cond.router}}:::conditional`);
    lines.push(`  ${cond.from} --> ${diamondNode}`);
    for (const route of cond.routes) {
      lines.push(`  ${diamondNode} -->|${route}| ${route}`);
    }
  }

  lines.push('  classDef conditional fill:#f9f,stroke:#333,stroke-width:2px');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tool-loop guard
// ---------------------------------------------------------------------------

export interface ToolLoopGuard {
  maxIterations: number;
  iterationKey: string;
  stateKey: string;
}

export function createToolLoopGuard(config: ToolLoopGuard) {
  return function guard(state: OnboardingStateType): boolean {
    const iterationCount = ((state as Record<string, unknown>)[config.iterationKey] as number) ?? 0;

    if (iterationCount >= config.maxIterations) {
      const correlationId = state.correlationId ?? 'unknown';
      const logger: AppLogger = baseLogger.child({ correlationId });
      logger.warn('agent.tool_loop_guard_triggered', {
        iterations: iterationCount,
        maxIterations: config.maxIterations,
        stateKey: config.stateKey,
      });
      return true;
    }

    return false;
  };
}
