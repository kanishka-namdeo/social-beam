/**
 * Verification Node — re-verifies scraper health after fixes are applied.
 */
import type { SelfHealerStateType } from '../state';
import { verificationTool } from '../tools/verification-tool';
import { logger } from '@/lib/logger';

const SCRAPER_TARGETS: Record<string, string> = {
  'creator-dashboard': '/analytics/creator/content/',
  'inbox': '/feed/?segmentationFilter=memberActivity',
  'browser-analytics': '/feed/update/urn:li:activity:0000000000/',
};

export async function verificationNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.verification.start');

  if (state.appliedFixes.length === 0) {
    log.info('self-healer.node.verification.no_fixes_applied');
    return {
      verificationResults: [],
      currentStep: 'report',
    };
  }

  const scraperNames = [...new Set(state.appliedFixes.map(f => f.scraperName))];
  const targetUrls: Record<string, string> = {};
  for (const name of scraperNames) {
    if (SCRAPER_TARGETS[name]) {
      targetUrls[name] = SCRAPER_TARGETS[name];
    }
  }

  try {
    const result = await verificationTool.invoke({
      workspaceId: state.workspaceId || 'default',
      scraperNames,
      targetUrls,
    });

    const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result)) as {
      results: import('../state').VerificationResult[];
      allVerified: boolean;
    };

    const results = parsed.results || [];
    const allVerified = parsed.allVerified;

    log.info('self-healer.node.verification.complete', {
      allVerified,
      verifiedCount: results.filter(r => r.verified).length,
      totalCount: results.length,
    });

    if (allVerified) {
      return {
        verificationResults: results,
        currentStep: 'report',
      };
    }

    // If not verified, check retry count
    const retryCount = state.fixRetryCount ?? 0;
    if (retryCount < 3) {
      // Retry: go back to DOM analysis
      return {
        verificationResults: results,
        fixRetryCount: retryCount + 1,
        currentStep: 'dom-analysis',
      };
    }

    // Max retries exceeded, go to report
    log.warn('self-healer.node.verification.max_retries_exceeded', { retryCount });
    return {
      verificationResults: results,
      currentStep: 'report',
    };
  } catch (error) {
    log.error('self-healer.node.verification.error', { error: String(error) });
    return {
      verificationResults: [],
      currentStep: 'report',
    };
  }
}
