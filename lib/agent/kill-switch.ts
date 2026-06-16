/**
 * Kill Switch — manages active agent runs with abort controllers.
 * Allows external termination of runaway or stuck agent runs.
 */
import { logger } from '@/lib/logger';

interface ActiveRun {
  runId: string;
  agentType: string;
  startedAt: Date;
  abortController: AbortController;
}

const activeRuns = new Map<string, ActiveRun>();
const MAX_ACTIVE_RUNS = 100;
const MAX_RUN_AGE_MS = 30 * 60 * 1000; // 30 minutes

/** Evict stale runs that exceeded max age. */
function evictStaleRuns(): void {
  const now = Date.now();
  for (const [runId, run] of activeRuns) {
    if (now - run.startedAt.getTime() > MAX_RUN_AGE_MS) {
      logger.warn('agent.killswitch.stale_run_evicted', {
        runId,
        age: Math.round((now - run.startedAt.getTime()) / 1000),
      });
      run.abortController.abort('evicted_due_to_age');
      activeRuns.delete(runId);
    }
  }
}

export function registerAgentRun(runId: string, agentType: string = 'unknown'): AbortController {
  // Evict stale runs before adding new ones
  if (activeRuns.size >= MAX_ACTIVE_RUNS) {
    evictStaleRuns();
  }

  const abortController = new AbortController();

  activeRuns.set(runId, {
    runId,
    agentType,
    startedAt: new Date(),
    abortController,
  });

  logger.info('agent.killswitch.registered', { runId, agentType, activeRuns: activeRuns.size });

  return abortController;
}

export function killAgentRun(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) {
    logger.warn('agent.killswitch.not_found', { runId });
    return false;
  }

  logger.info('agent.killswitch.killing', {
    runId,
    agentType: run.agentType,
    runningFor: Date.now() - run.startedAt.getTime(),
  });

  run.abortController.abort('killed_by_admin');
  activeRuns.delete(runId);

  logger.info('agent.killswitch.killed', { runId });
  return true;
}

export function unregisterAgentRun(runId: string): void {
  activeRuns.delete(runId);
}

export function listActiveRuns(): Array<{
  runId: string;
  startedAt: Date;
  agentType: string;
}> {
  return Array.from(activeRuns.values()).map((run) => ({
    runId: run.runId,
    startedAt: run.startedAt,
    agentType: run.agentType,
  }));
}

export function getAbortController(runId: string): AbortController | undefined {
  return activeRuns.get(runId)?.abortController;
}
