/**
 * Tool Policy — defines which tools each agent graph is allowed to use.
 * Enforces allowlists to prevent agents from calling tools outside their scope.
 */
import { logger } from '@/lib/logger';

export type AgentType = 'onboarding' | 'brand-analyzer' | 'self-healer' | 'compose';

const ONBOARDING_TOOLS = [
  'initiate_oauth',
  'complete_oauth',
  'list_connected_platforms',
  'save_audience',
  'get_audience',
  'save_brand_context',
  'get_brand_context',
  'save_platform_context',
  'save_brand_voice',
  'get_brand_voice',
  'preview_brand_voice',
  'fetch_posts',
  'save_full_brand_context',
] as const;

const BRAND_ANALYZER_TOOLS = [
  'web_fetch',
  'web_search',
  'save_full_brand_context',
  'save_brand_context',
  'get_brand_context',
  'save_platform_context',
] as const;

const SELF_HEALER_TOOLS = [
  'dom_probe',
  'failure_detector',
  'fix_applier',
  'verification',
] as const;

const COMPOSE_TOOLS = [
  'get_brand_context',
  'get_brand_voice',
  'get_audience',
  'preview_brand_voice',
] as const;

export const TOOL_ALLOWLISTS: Record<AgentType, ReadonlySet<string>> = {
  onboarding: new Set(ONBOARDING_TOOLS),
  'brand-analyzer': new Set(BRAND_ANALYZER_TOOLS),
  'self-healer': new Set(SELF_HEALER_TOOLS),
  compose: new Set(COMPOSE_TOOLS),
};

export interface ToolAccessResult {
  allowed: boolean;
  reason?: string;
}

export function validateToolAccess(agentType: string, toolName: string): ToolAccessResult {
  const agent = agentType as AgentType;
  const allowlist = TOOL_ALLOWLISTS[agent];

  if (!allowlist) {
    logger.warn('agent.policy.unknown_agent', { agentType, toolName });
    return { allowed: false, reason: `Unknown agent type: ${agentType}` };
  }

  if (!allowlist.has(toolName)) {
    logger.warn('agent.policy.access_denied', { agentType, toolName });
    return {
      allowed: false,
      reason: `Tool "${toolName}" is not allowed for agent "${agentType}". Allowed: ${[...allowlist].join(', ')}`,
    };
  }

  return { allowed: true };
}
