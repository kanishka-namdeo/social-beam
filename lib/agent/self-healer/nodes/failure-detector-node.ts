/**
 * Failure Detector Node — analyzes DOM snapshots to detect scraper failures.
 */
import type { SelfHealerStateType, ScraperFailure } from '../state';
import { failureDetectorTool } from '../tools/failure-detector-tool';
import { logger } from '@/lib/logger';

export async function failureDetectorNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.failure_detector.start');

  if (Object.keys(state.domSnapshots).length === 0) {
    log.warn('self-healer.node.failure_detector.no_snapshots');
    return {
      failures: [],
      currentStep: 'report',
    };
  }

  try {
    const result = await failureDetectorTool.invoke({
      domSnapshots: state.domSnapshots,
    });

    const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result)) as { failures: ScraperFailure[] };

    const failures = parsed.failures || [];
    const criticalFailures = failures.filter(f => f.severity === 'critical');

    log.info('self-healer.node.failure_detector.complete', {
      totalFailures: failures.length,
      criticalFailures: criticalFailures.length,
    });

    if (criticalFailures.length === 0 && failures.filter(f => f.selectorType === 'health-summary').every(f => f.healthScore >= 80)) {
      // All healthy
      return {
        failures,
        currentStep: 'report',
      };
    }

    return {
      failures,
      currentStep: 'dom-analysis',
    };
  } catch (error) {
    log.error('self-healer.node.failure_detector.error', { error: String(error) });
    return {
      failures: [],
      currentStep: 'report',
    };
  }
}
