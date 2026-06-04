/**
 * Fix Applier Node — applies code patches to scraper files.
 */
import type { SelfHealerStateType } from '../state';
import { fixApplierTool } from '../tools/fix-applier-tool';
import { logger } from '@/lib/logger';

export async function fixApplierNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.fix_applier.start');

  if (state.proposedFixes.length === 0) {
    log.info('self-healer.node.fix_applier.no_fixes');
    return {
      currentStep: 'report',
    };
  }

  try {
    const result = await fixApplierTool.invoke({
      patches: state.proposedFixes,
    });

    const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result)) as {
      applied: number;
      errors: number;
      details: Array<{ scraperName: string; filePath: string; success: boolean; error?: string }>;
    };

    const appliedFixes = state.proposedFixes.filter(p =>
      parsed.details.some(d => d.filePath === p.filePath && d.success)
    );

    log.info('self-healer.node.fix_applier.complete', {
      applied: parsed.applied,
      errors: parsed.errors,
    });

    return {
      appliedFixes,
      currentStep: 'verification',
    };
  } catch (error) {
    log.error('self-healer.node.fix_applier.error', { error: String(error) });
    return {
      currentStep: 'report',
    };
  }
}
