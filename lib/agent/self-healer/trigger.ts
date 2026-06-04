/**
 * Self-Healer Trigger — ad-hoc trigger utility for on-demand healer runs.
 *
 * Usage:
 *   import { triggerSelfHealer } from '@/lib/agent/self-healer/trigger';
 *   await triggerSelfHealer('creator-dashboard');
 */
import { getSelfHealerGraph } from './graph';
import { SelfHealerState } from './state';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

let healerRunning = false;

export async function triggerSelfHealer(
  scraperTarget: string = 'all',
  workspaceId: string = 'default',
): Promise<void> {
  if (healerRunning) {
    logger.warn('self-healer.trigger.already_running', { scraperTarget });
    return;
  }

  healerRunning = true;
  const runId = crypto.randomUUID();

  try {
    logger.info('self-healer.trigger.start', { runId, scraperTarget, workspaceId });

    const graph = await getSelfHealerGraph();
    const result = await graph.invoke(
      {
        scraperTarget,
        workspaceId,
        runId,
        correlationId: runId,
        userId: 'self-healer',
      },
      {} as Parameters<typeof graph.invoke>[1],
    );

    logger.info('self-healer.trigger.complete', {
      runId,
      scraperTarget,
      finalStep: result.currentStep,
      appliedFixes: result.appliedFixes?.length ?? 0,
      verificationResults: result.verificationResults?.length ?? 0,
    });
  } catch (error) {
    logger.error('self-healer.trigger.error', { runId, error: String(error) });
  } finally {
    healerRunning = false;
  }
}
