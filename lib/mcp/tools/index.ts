import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpUserContext, McpScope } from '../types';
import { registerAccountTools } from './accounts';
import { registerComposeTools } from './compose';
import { registerAnalyticsTools } from './analytics';
import { registerBrandTools } from './brand';
import { registerInboxTools } from './inbox';
import { registerPublishTools } from './publish';
import { registerRedditTools } from './reddit';

export function registerAllTools(
  server: McpServer,
  ctx: McpUserContext,
  allowedScopes: readonly McpScope[]
): void {
  const hasAiToolsScope = allowedScopes.includes('mcp:ai-tools');
  const aiToolsOption = { skipAiTools: !hasAiToolsScope };

  if (allowedScopes.includes('mcp:accounts')) registerAccountTools(server);
  if (allowedScopes.includes('mcp:compose')) registerComposeTools(server, aiToolsOption);
  if (allowedScopes.includes('mcp:analytics')) registerAnalyticsTools(server, aiToolsOption);
  if (allowedScopes.includes('mcp:brand')) registerBrandTools(server, aiToolsOption);
  if (allowedScopes.includes('mcp:inbox')) registerInboxTools(server, aiToolsOption);
  if (allowedScopes.includes('mcp:publish')) registerPublishTools(server);
  if (allowedScopes.includes('mcp:reddit')) registerRedditTools(server, aiToolsOption);
}
