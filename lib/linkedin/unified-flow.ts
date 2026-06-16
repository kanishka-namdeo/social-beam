import { logger } from '@/lib/logger';

export interface UnifiedFlowState {
  workspaceId: string;
  userId: string;
  browser: any;
  /** Page where the user logs in and approves OAuth consent */
  oauthPage: any;
  /** Secondary page used for cookie extraction (opens after login detection) */
  cookiePage: any;
  status: 'waiting_login' | 'waiting_oauth' | 'processing' | 'complete' | 'error';
  error?: string;
  cookieExpiry?: Date;
  platformUserId?: string;
  /** Encrypted session cookie captured after login, applied when ConnectedAccount is created */
  sessionCookie?: string;
  createdAt: number;
}

// Persist flows across hot reloads by storing on globalThis
const globalForFlows = globalThis as unknown as {
  flows: Map<string, UnifiedFlowState> | undefined;
};

const flows = globalForFlows.flows ?? new Map<string, UnifiedFlowState>();
globalForFlows.flows = flows;

const FLOW_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function createFlow(
  flowId: string,
  workspaceId: string,
  userId: string,
  browser: any,
  oauthPage: any,
  cookiePage: any,
): UnifiedFlowState {
  const state: UnifiedFlowState = {
    workspaceId,
    userId,
    browser,
    oauthPage,
    cookiePage,
    status: 'waiting_login',
    createdAt: Date.now(),
  };
  flows.set(flowId, state);
  logger.debug('linkedin.unified_flow.created', { flowId, workspaceId });
  return state;
}

export function getFlow(flowId: string): UnifiedFlowState | undefined {
  const flow = flows.get(flowId);
  if (!flow) {
    return undefined;
  }

  // Garbage collect expired flows
  const elapsed = Date.now() - flow.createdAt;
  if (elapsed > FLOW_TIMEOUT_MS) {
    cleanupFlow(flowId);
    return undefined;
  }

  return flow;
}

const FLOW_TERMINAL_CLEANUP_MS = 15_000; // 15s after completion/failure

export function completeFlow(flowId: string, platformUserId?: string, cookieExpiry?: Date): void {
  const flow = flows.get(flowId);
  if (flow) {
    flow.status = 'complete';
    flow.platformUserId = platformUserId;
    flow.cookieExpiry = cookieExpiry;
    logger.debug('linkedin.unified_flow.completed', { flowId, platformUserId });
    // Close the browser reference after a short delay so callers can still
    // read terminal state, then evict from the Map to free memory.
    setTimeout(() => cleanupFlow(flowId), FLOW_TERMINAL_CLEANUP_MS).unref();
  }
}

export function failFlow(flowId: string, error: string): void {
  const flow = flows.get(flowId);
  if (flow) {
    flow.status = 'error';
    flow.error = error;
    logger.debug('linkedin.unified_flow.failed', { flowId, error });
    setTimeout(() => cleanupFlow(flowId), FLOW_TERMINAL_CLEANUP_MS).unref();
  }
}

export function cleanupFlow(flowId: string): void {
  const flow = flows.get(flowId);
  if (flow) {
    // Close pages sequentially, awaiting each before proceeding
    // Using fire-and-forget pattern with explicit sequencing
    (async () => {
      try {
        // Close oauth page first
        if (flow.oauthPage) {
          try {
            await flow.oauthPage.close();
            logger.debug('linkedin.unified_flow.oauth_page_closed', { flowId });
          } catch (err: any) {
            logger.warn('linkedin.unified_flow.oauth_page_close_error', { flowId, error: String(err) });
          }
          flow.oauthPage = null as any;
        }

        // Close cookie page next
        if (flow.cookiePage) {
          try {
            await flow.cookiePage.close();
            logger.debug('linkedin.unified_flow.cookie_page_closed', { flowId });
          } catch (err: any) {
            logger.warn('linkedin.unified_flow.cookie_page_close_error', { flowId, error: String(err) });
          }
          flow.cookiePage = null as any;
        }

        // Finally close browser after pages are closed
        if (flow.browser) {
          try {
            await flow.browser.close();
            logger.debug('linkedin.unified_flow.browser_closed', { flowId });
          } catch (err: any) {
            logger.warn('linkedin.unified_flow.browser_close_error', { flowId, error: String(err) });
          }
          flow.browser = null as any;
        }

        flows.delete(flowId);
        logger.debug('linkedin.unified_flow.cleaned_up', { flowId });
      } catch (err: any) {
        logger.error('linkedin.unified_flow.cleanup_error', { flowId, error: String(err) });
      }
    })();
  }
}

// Periodic cleanup of expired flows (every 5 minutes)
// Guard against duplicate intervals from hot reloads
const GLOBAL_CLEANUP_INTERVAL_KEY = '__socialbeam_linkedin_flow_cleanup_interval';
if (!(globalThis as any)[GLOBAL_CLEANUP_INTERVAL_KEY]) {
  (globalThis as any)[GLOBAL_CLEANUP_INTERVAL_KEY] = setInterval(() => {
    const now = Date.now();
    for (const [flowId, flow] of flows.entries()) {
      if (now - flow.createdAt > FLOW_TIMEOUT_MS) {
        cleanupFlow(flowId);
      }
    }
  }, 5 * 60 * 1000).unref();
}
