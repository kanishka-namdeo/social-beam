/**
 * DOM Probe Node — probes all target LinkedIn pages and captures DOM snapshots.
 */
import type { SelfHealerStateType } from '../state';
import { domProbeTool } from '../tools/dom-probe-tool';
import { logger } from '@/lib/logger';

const SCRAPER_TARGETS: Record<string, string> = {
  'creator-dashboard': '/analytics/creator/content/',
  'inbox': '/feed/?segmentationFilter=memberActivity',
  'browser-analytics': '/feed/update/urn:li:activity:0000000000/', // placeholder — will use any post URL
};

export async function domProbeNode(state: SelfHealerStateType): Promise<Partial<SelfHealerStateType>> {
  const log = logger.child({ runId: state.runId });
  log.info('self-healer.node.dom_probe.start');

  const targetsToProbe = state.scraperTarget === 'all'
    ? Object.keys(SCRAPER_TARGETS)
    : [state.scraperTarget];

  const snapshots: Record<string, import('../state').DOMSnapshot> = {};

  for (const scraperName of targetsToProbe) {
    const targetUrl = SCRAPER_TARGETS[scraperName];
    if (!targetUrl) {
      log.warn('self-healer.node.dom_probe.unknown_target', { scraperName });
      continue;
    }

    try {
      const result = await domProbeTool.invoke({
        workspaceId: state.workspaceId || 'default',
        targetUrl,
        scraperName,
      });

      const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result)) as Record<string, unknown>;

      if (!parsed.error) {
        snapshots[scraperName] = parsed as unknown as import('../state').DOMSnapshot;
        log.info('self-healer.node.dom_probe.snapshot_captured', { scraperName });
      } else {
        log.warn('self-healer.node.dom_probe.probe_failed', { scraperName, error: parsed.error });
      }
    } catch (error) {
      log.error('self-healer.node.dom_probe.error', { scraperName, error: String(error) });
    }
  }

  return {
    domSnapshots: snapshots,
    currentStep: 'failure-detection',
  };
}
