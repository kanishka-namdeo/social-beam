/**
 * DOM Analyzer Node — uses LLM to analyze DOM changes per scraper.
 */
import type { SelfHealerStateType } from '../state';
import { analyzeDOM } from '../tools/dom-analyzer-tool';
import { logger } from '@/lib/logger';

export async function domAnalyzerNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.dom_analyzer.start');

  const domDiffs: Record<string, import('../state').DOMDiff> = {};
  const scrapersToAnalyze = [...new Set(state.failures.map(f => f.scraperName))];

  for (const scraperName of scrapersToAnalyze) {
    const snapshot = state.domSnapshots[scraperName];
    if (!snapshot) {
      log.warn('self-healer.node.dom_analyzer.no_snapshot', { scraperName });
      continue;
    }

    try {
      const diff = await analyzeDOM(scraperName, snapshot, state.failures);
      domDiffs[scraperName] = diff;
      log.info('self-healer.node.dom_analyzer.complete', {
        scraperName,
        changedCount: diff.changedSelectors.length,
      });
    } catch (error) {
      log.error('self-healer.node.dom_analyzer.error', { scraperName, error: String(error) });
    }
  }

  return {
    domDiff: domDiffs,
    currentStep: 'fix-generation',
  };
}
