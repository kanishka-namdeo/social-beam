/**
 * Report Node — generates a final report of the self-healing run.
 */
import type { SelfHealerStateType } from '../state';
import { logger } from '@/lib/logger';
import { AIMessage } from '@langchain/core/messages';

export async function reportNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.report.start');

  const duration = Date.now() - state.startTime;
  const totalFailures = state.failures.length;
  const appliedFixes = state.appliedFixes.length;
  const verifiedCount = state.verificationResults.filter(r => r.verified).length;
  const totalVerifications = state.verificationResults.length;

  const report = {
    runId: state.runId,
    scraperTarget: state.scraperTarget,
    durationMs: duration,
    summary: {
      totalFailures,
      appliedFixes,
      verificationResults: state.verificationResults.map(r => ({
        scraperName: r.scraperName,
        verified: r.verified,
        healthScore: r.healthScore,
        message: r.message,
      })),
    },
    fixes: state.appliedFixes.map(f => ({
      scraperName: f.scraperName,
      filePath: f.filePath,
      rationale: f.rationale,
      confidence: f.confidence,
    })),
    failures: state.failures
      .filter(f => f.selectorType !== 'health-summary')
      .map(f => ({
        scraperName: f.scraperName,
        selectorType: f.selectorType,
        selector: f.selector,
        severity: f.severity,
      })),
  };

  log.info('self-healer.node.report.complete', report);

  return {
    currentStep: 'done',
    messages: [
      new AIMessage(
        `Self-healing run complete: ${appliedFixes} fixes applied, ${verifiedCount}/${totalVerifications} scrapers verified healthy. Duration: ${(duration / 1000).toFixed(1)}s`,
      ),
    ],
  };
}
