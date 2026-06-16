import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AsyncLocalStorage } from 'async_hooks';
import type { McpUserContext } from './types';
import { MCP_SCOPES } from './types';
import { registerAllTools } from './tools';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

export const mcpContext = new AsyncLocalStorage<McpUserContext>();

export function createMcpServer(ctx: McpUserContext): McpServer {
  const server = new McpServer({
    name: 'social-beam',
    version: '1.0.0',
  });

  const hasScope = (scope: string) => ctx.scopes.includes(scope);
  const allowedScopes = MCP_SCOPES.filter(hasScope);

  registerAllTools(server, ctx, allowedScopes);
  registerResources(server, ctx);
  registerPrompts(server);

  return server;
}

export { type McpUserContext } from './types';
