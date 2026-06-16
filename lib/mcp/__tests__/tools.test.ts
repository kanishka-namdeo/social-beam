// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer, mcpContext } from '../server';
import type { McpUserContext } from '../types';

describe('MCP Server Integration', () => {
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  const testCtx: McpUserContext = {
    userId: 'test-user-1',
    workspaceId: 'test-workspace-1',
    role: 'FREE_USER',
    scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit'],
  };

  beforeAll(async () => {
    const server = createMcpServer(testCtx);
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists all tools', async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThan(0);
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('accounts_list');
    expect(toolNames).toContain('compose_create_post');
    expect(toolNames).toContain('brand_get_context');
  });

  it('lists all resources', async () => {
    const result = await client.listResources();
    expect(result.resources.length).toBeGreaterThan(0);
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain('brand://context');
    expect(uris).toContain('config://platforms');
  });

  it('lists all prompts', async () => {
    const result = await client.listPrompts();
    expect(result.prompts.length).toBeGreaterThan(0);
    const names = result.prompts.map((p) => p.name);
    expect(names).toContain('create-content-calendar');
    expect(names).toContain('trending-to-content');
  });

  it('filters tools by scope', async () => {
    const limitedCtx: McpUserContext = {
      ...testCtx,
      scopes: ['mcp:accounts'],
    };
    const limitedServer = createMcpServer(limitedCtx);
    const [limitedClientTransport, limitedServerTransport] = InMemoryTransport.createLinkedPair();
    const limitedClient = new Client({ name: 'limited-client', version: '1.0.0' });

    await limitedServer.connect(limitedServerTransport);
    await limitedClient.connect(limitedClientTransport);

    const result = await limitedClient.listTools();
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('accounts_list');
    expect(toolNames).not.toContain('compose_create_post');
    expect(toolNames).not.toContain('brand_get_context');

    await limitedClient.close();
  });

  it('free user does not see AI-powered tools', async () => {
    const freeCtx: McpUserContext = {
      ...testCtx,
      role: 'FREE_USER',
      scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit'],
      // no mcp:ai-tools
    };
    const freeServer = createMcpServer(freeCtx);
    const [freeClientTransport, freeServerTransport] = InMemoryTransport.createLinkedPair();
    const freeClient = new Client({ name: 'free-client', version: '1.0.0' });

    await freeServer.connect(freeServerTransport);
    await freeClient.connect(freeClientTransport);

    const result = await freeClient.listTools();
    const toolNames = result.tools.map((t) => t.name);

    // AI tools should NOT be visible
    expect(toolNames).not.toContain('compose_generate');
    expect(toolNames).not.toContain('analytics_recommendations');
    expect(toolNames).not.toContain('brand_test');
    expect(toolNames).not.toContain('inbox_draft_reply');
    expect(toolNames).not.toContain('reddit_analyze');

    // Non-AI tools SHOULD be visible
    expect(toolNames).toContain('compose_create_post');
    expect(toolNames).toContain('compose_list_posts');
    expect(toolNames).toContain('analytics_overview');
    expect(toolNames).toContain('brand_get_context');
    expect(toolNames).toContain('inbox_list');
    expect(toolNames).toContain('accounts_list');

    await freeClient.close();
  });

  it('premium user sees all tools including AI-powered', async () => {
    const premiumCtx: McpUserContext = {
      ...testCtx,
      role: 'PREMIUM_USER',
      scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit', 'mcp:ai-tools'],
    };
    const premiumServer = createMcpServer(premiumCtx);
    const [premiumClientTransport, premiumServerTransport] = InMemoryTransport.createLinkedPair();
    const premiumClient = new Client({ name: 'premium-client', version: '1.0.0' });

    await premiumServer.connect(premiumServerTransport);
    await premiumClient.connect(premiumClientTransport);

    const result = await premiumClient.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain('compose_generate');
    expect(toolNames).toContain('analytics_recommendations');
    expect(toolNames).toContain('brand_test');
    expect(toolNames).toContain('inbox_draft_reply');
    expect(toolNames).toContain('reddit_analyze');

    await premiumClient.close();
  });

  it('calling config://platforms resource returns platform data', async () => {
    const result = await client.readResource({ uri: 'config://platforms' });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe('config://platforms');
    expect('text' in content).toBe(true);
    const parsed = JSON.parse((content as { uri: string; text: string }).text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('name');
    expect(parsed[0]).toHaveProperty('characterLimit');
  });
});
