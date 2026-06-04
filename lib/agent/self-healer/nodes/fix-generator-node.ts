/**
 * Fix Generator Node — generates code patches for broken scrapers.
 */
import type { SelfHealerStateType } from '../state';
import { generateFixes } from '../tools/fix-generator-tool';
import { logger } from '@/lib/logger';

export async function fixGeneratorNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.fix_generator.start');

  const allPatches: import('../state').CodePatch[] = [];
  const scrapersToFix = Object.keys(state.domDiff);

  for (const scraperName of scrapersToFix) {
    const diff = state.domDiff[scraperName];
    if (!diff) continue;

    try {
      const patches = await generateFixes(scraperName, diff);
      allPatches.push(...patches);
      log.info('self-healer.node.fix_generator.complete', {
        scraperName,
        patchCount: patches.length,
      });
    } catch (error) {
      log.error('self-healer.node.fix_generator.error', { scraperName, error: String(error) });
    }
  }

  if (allPatches.length === 0) {
    log.info('self-healer.node.fix_generator.no_patches');
    return {
      proposedFixes: [],
      currentStep: 'report',
    };
  }

  return {
    proposedFixes: allPatches,
    currentStep: 'fix-application',
  };
}
