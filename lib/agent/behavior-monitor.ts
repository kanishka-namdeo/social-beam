/**
 * Agent Behavior Monitor — tracks per-agent-run metrics and enforces safety thresholds.
 * Provides kill-switch integration for runaway agents.
 */
import { logger } from '@/lib/logger';

export interface AgentAction {
  type: 'tool_call' | 'node_transition' | 'llm_call' | 'error';
  toolName?: string;
  nodeName?: string;
  tokenCount?: number;
  errorMessage?: string;
  timestamp: number;
}

interface AgentRunMetrics {
  runId: string;
  agentType: string;
  startedAt: number;
  toolCallCount: number;
  tokenUsage: number;
  errorCount: number;
  totalActions: number;
  nodeSequence: string[];
  lastActionAt: number;
}

const THRESHOLDS = {
  maxToolCallsPerRun: 50,
  maxTokenUsagePerRun: 100_000,
  maxErrorRate: 0.30,
  maxExecutionTimeMs: 10 * 60 * 1000,
} as const;

const activeRuns = new Map<string, AgentRunMetrics>();
const MAX_ACTIVE_RUNS = 500;

/** Evict stale/orphaned runs that exceeded max execution time. */
function evictStaleRuns(): void {
  const now = Date.now();
  for (const [runId, metrics] of activeRuns) {
    if (now - metrics.startedAt > THRESHOLDS.maxExecutionTimeMs) {
      logger.warn('agent.monitor.stale_run_evicted', {
        runId,
        age: Math.round((now - metrics.startedAt) / 1000),
      });
      activeRuns.delete(runId);
    }
  }
}

export function startAgentRun(runId: string, agentType: string): void {
  // Evict stale runs before adding new ones
  if (activeRuns.size >= MAX_ACTIVE_RUNS) {
    evictStaleRuns();
  }

  activeRuns.set(runId, {
    runId,
    agentType,
    startedAt: Date.now(),
    toolCallCount: 0,
    tokenUsage: 0,
    errorCount: 0,
    totalActions: 0,
    nodeSequence: [],
    lastActionAt: Date.now(),
  });

  logger.info('agent.monitor.run_started', { runId, agentType });
}

export function recordAgentAction(runId: string, action: AgentAction): void {
  const metrics = activeRuns.get(runId);
  if (!metrics) {
    logger.debug('agent.monitor.unknown_run', { runId });
    return;
  }

  metrics.totalActions++;
  metrics.lastActionAt = action.timestamp;

  switch (action.type) {
    case 'tool_call':
      metrics.toolCallCount++;
      break;
    case 'llm_call':
      metrics.tokenUsage += action.tokenCount ?? 0;
      break;
    case 'error':
      metrics.errorCount++;
      break;
    case 'node_transition':
      if (action.nodeName) {
        metrics.nodeSequence.push(action.nodeName);
        // Cap nodeSequence to prevent unbounded growth during long runs
        if (metrics.nodeSequence.length > 200) {
          metrics.nodeSequence.splice(0, metrics.nodeSequence.length - 200);
        }
      }
      break;
  }
}

export function checkAgentHealth(runId: string): { healthy: boolean; reason?: string } {
  const metrics = activeRuns.get(runId);
  if (!metrics) {
    return { healthy: false, reason: `Unknown run: ${runId}` };
  }

  const elapsed = Date.now() - metrics.startedAt;

  if (elapsed > THRESHOLDS.maxExecutionTimeMs) {
    const reason = `Execution time exceeded ${THRESHOLDS.maxExecutionTimeMs / 1000}s (elapsed: ${Math.round(elapsed / 1000)}s)`;
    logger.warn('agent.monitor.threshold_exceeded', { runId, reason });
    return { healthy: false, reason };
  }

  if (metrics.toolCallCount > THRESHOLDS.maxToolCallsPerRun) {
    const reason = `Tool call count (${metrics.toolCallCount}) exceeded max (${THRESHOLDS.maxToolCallsPerRun})`;
    logger.warn('agent.monitor.threshold_exceeded', { runId, reason });
    return { healthy: false, reason };
  }

  if (metrics.tokenUsage > THRESHOLDS.maxTokenUsagePerRun) {
    const reason = `Token usage (${metrics.tokenUsage}) exceeded max (${THRESHOLDS.maxTokenUsagePerRun})`;
    logger.warn('agent.monitor.threshold_exceeded', { runId, reason });
    return { healthy: false, reason };
  }

  const errorRate = metrics.totalActions > 0 ? metrics.errorCount / metrics.totalActions : 0;
  if (errorRate > THRESHOLDS.maxErrorRate && metrics.totalActions >= 3) {
    const reason = `Error rate (${(errorRate * 100).toFixed(1)}%) exceeded max (${THRESHOLDS.maxErrorRate * 100}%)`;
    logger.warn('agent.monitor.threshold_exceeded', { runId, reason });
    return { healthy: false, reason };
  }

  return { healthy: true };
}

export function finishAgentRun(runId: string): void {
  const metrics = activeRuns.get(runId);
  if (metrics) {
    logger.info('agent.monitor.run_finished', {
      runId,
      agentType: metrics.agentType,
      duration: Date.now() - metrics.startedAt,
      toolCalls: metrics.toolCallCount,
      tokens: metrics.tokenUsage,
      errors: metrics.errorCount,
    });
    activeRuns.delete(runId);
  }
}

export function getRunMetrics(runId: string): AgentRunMetrics | undefined {
  return activeRuns.get(runId);
}

export function listActiveRuns(): Array<{
  runId: string;
  agentType: string;
  startedAt: Date;
  toolCallCount: number;
  tokenUsage: number;
  healthy: boolean;
}> {
  return Array.from(activeRuns.entries()).map(([runId, metrics]) => ({
    runId,
    agentType: metrics.agentType,
    startedAt: new Date(metrics.startedAt),
    toolCallCount: metrics.toolCallCount,
    tokenUsage: metrics.tokenUsage,
    healthy: checkAgentHealth(runId).healthy,
  }));
}
