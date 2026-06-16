export interface McpUserContext {
  userId: string;
  workspaceId: string;
  role: string;
  scopes: string[];
}

export const MCP_SCOPES = [
  'mcp:accounts',
  'mcp:compose',
  'mcp:analytics',
  'mcp:brand',
  'mcp:inbox',
  'mcp:publish',
  'mcp:reddit',
  'mcp:ai-tools',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

/**
 * Maps individual tool names to their required scopes.
 * Tools not listed here only need their parent scope (e.g., mcp:compose).
 * AI-powered tools require BOTH their parent scope AND mcp:ai-tools.
 */
export const MCP_TOOL_SCOPE_MAP: Record<string, readonly string[]> = {
  // AI-powered tools — require mcp:ai-tools
  compose_generate: ['mcp:compose', 'mcp:ai-tools'],
  analytics_recommendations: ['mcp:analytics', 'mcp:ai-tools'],
  brand_test: ['mcp:brand', 'mcp:ai-tools'],
  inbox_draft_reply: ['mcp:inbox', 'mcp:ai-tools'],
  reddit_analyze: ['mcp:reddit', 'mcp:ai-tools'],
} as const;

/** Scopes that require PREMIUM_USER or ADMIN role */
export const PREMIUM_MCP_SCOPES: readonly string[] = ['mcp:ai-tools'] as const;
