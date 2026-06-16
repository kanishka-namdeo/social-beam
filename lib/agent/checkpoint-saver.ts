import { type BrandAnalyzerStateType } from './state';
import { saveBrandDraft } from '@/lib/db/brand-context';
import { logger } from '@/lib/logger';

export interface CheckpointMapping {
  [nodeAfter: string]: {
    checkpointStep: string;
    requiredStateKeys: string[];
  };
}

export const CHECKPOINT_MAP: CheckpointMapping = {
  contextCollector: { checkpointStep: 'collected', requiredStateKeys: ['crawledContent'] },
  brandPageSelector: { checkpointStep: 'pages_selected', requiredStateKeys: ['crawledContent'] },
  brandAnalyzer: { checkpointStep: 'brand_analyzed', requiredStateKeys: ['brandContextDraft'] },
  platformAdapter: { checkpointStep: 'platforms_ready', requiredStateKeys: ['brandContextDraft', 'platformContextsDraft'] },
  sampleGenerator: { checkpointStep: 'samples_ready', requiredStateKeys: ['brandContextDraft', 'platformContextsDraft', 'samplePosts'] },
  contextWait: { checkpointStep: 'samples_ready', requiredStateKeys: [] },
};

/**
 * Save a checkpoint after a graph node completes.
 * This is fire-and-forget — errors are logged but not thrown.
 */
export async function saveCheckpoint(
  state: BrandAnalyzerStateType,
  checkpointStep: string,
  threadId: string,
): Promise<void> {
  try {
    if (!state.workspaceId) {
      logger.warn('agent.checkpoint.no_workspace_id', { threadId, checkpointStep });
      return;
    }

    const stateValues: Record<string, unknown> = {
      brandContextDraft: state.brandContextDraft,
      platformContextsDraft: state.platformContextsDraft,
      samplePosts: state.samplePosts,
      crawledContent: state.crawledContent,
      currentStep: state.currentStep,
      websiteUrl: state.websiteUrl,
      brandDescription: state.brandDescription,
      connectedPlatforms: state.connectedPlatforms,
      connectedAccountDetails: state.connectedAccountDetails,
      __crawlPages: state.__crawlPages,
      __selectedPages: state.__selectedPages,
      __totalPagesBefore: state.__totalPagesBefore,
      // Input fields needed for resume reconstruction
      workspaceId: state.workspaceId,
      userId: state.userId,
      correlationId: state.correlationId,
      messages: state.messages as unknown,
    };

    await saveBrandDraft(state.workspaceId, threadId, checkpointStep, stateValues);
    logger.info('agent.checkpoint.saved', { workspaceId: state.workspaceId, threadId, checkpointStep });
  } catch (err) {
    logger.error('agent.checkpoint.save_error', { checkpointStep, threadId, error: String(err) });
  }
}
