import { mcpContext } from './server';
import type { McpUserContext } from './types';
import { MCP_TOOL_SCOPE_MAP } from './types';

export function success(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function error(message: string, agentHint?: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message, agentHint }, null, 2) }],
    isError: true,
  };
}

export function requireContext(): McpUserContext {
  const ctx = mcpContext.getStore();
  if (!ctx) throw new Error('No MCP context available');
  return ctx;
}

export function requirePremiumScope(toolName: string): boolean {
  const ctx = mcpContext.getStore();
  if (!ctx) return false;
  const requiredScopes = MCP_TOOL_SCOPE_MAP[toolName];
  if (!requiredScopes) return true; // no special scope needed
  return requiredScopes.every(s => ctx.scopes.includes(s));
}

export function premiumScopeError(): ReturnType<typeof error> {
  return error(
    'This tool requires a Premium subscription',
    'Upgrade at /billing to access AI-powered tools'
  );
}
