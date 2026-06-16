// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../server';
import type { McpUserContext } from '../types';

describe('MCP Server Factory', () => {
  const fullCtx: McpUserContext = {
    userId: 'test-user-1',
    workspaceId: 'test-workspace-1',
    role: 'FREE_USER',
    scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit'],
  };

  describe('createMcpServer', () => {
    it('creates a server with correct name and version', async () => {
      const server = createMcpServer(fullCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'test-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const serverInfo = await client.getServerVersion();
      expect(serverInfo?.name).toBe('social-beam');
      expect(serverInfo?.version).toBe('1.0.0');

      await client.close();
    });

    it('registers tools based on scopes', async () => {
      const limitedCtx: McpUserContext = {
        ...fullCtx,
        scopes: ['mcp:accounts'],
      };
      const server = createMcpServer(limitedCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'limited-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);

      expect(toolNames).toContain('accounts_list');
      expect(toolNames).not.toContain('compose_create_post');
      expect(toolNames).not.toContain('brand_get_context');
      expect(toolNames).not.toContain('analytics_get_metrics');
      expect(toolNames).not.toContain('inbox_list_messages');

      await client.close();
    });

    it('free user with all parent scopes does not see AI tools', async () => {
      const freeCtx: McpUserContext = {
        ...fullCtx,
        role: 'FREE_USER',
        scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit'],
      };
      const server = createMcpServer(freeCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'free-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);

      // Non-AI tools should be visible
      expect(toolNames).toContain('compose_create_post');
      expect(toolNames).toContain('analytics_overview');
      expect(toolNames).toContain('brand_get_context');
      expect(toolNames).toContain('inbox_list');
      expect(toolNames).toContain('reddit_trending');

      // AI tools should NOT be visible
      expect(toolNames).not.toContain('compose_generate');
      expect(toolNames).not.toContain('analytics_recommendations');
      expect(toolNames).not.toContain('brand_test');
      expect(toolNames).not.toContain('inbox_draft_reply');
      expect(toolNames).not.toContain('reddit_analyze');

      await client.close();
    });

    it('premium user with ai-tools scope sees all tools', async () => {
      const premiumCtx: McpUserContext = {
        ...fullCtx,
        role: 'PREMIUM_USER',
        scopes: ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit', 'mcp:ai-tools'],
      };
      const server = createMcpServer(premiumCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'premium-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);

      // All tools should be visible including AI tools
      expect(toolNames).toContain('compose_create_post');
      expect(toolNames).toContain('compose_generate');
      expect(toolNames).toContain('analytics_overview');
      expect(toolNames).toContain('analytics_recommendations');
      expect(toolNames).toContain('brand_get_context');
      expect(toolNames).toContain('brand_test');
      expect(toolNames).toContain('inbox_list');
      expect(toolNames).toContain('inbox_draft_reply');
      expect(toolNames).toContain('reddit_trending');
      expect(toolNames).toContain('reddit_analyze');

      await client.close();
    });

    it('registers resources', async () => {
      const server = createMcpServer(fullCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'test-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.listResources();
      expect(result.resources.length).toBeGreaterThan(0);
      const uris = result.resources.map((r) => r.uri);
      expect(uris).toContain('brand://context');
      expect(uris).toContain('brand://health');
      expect(uris).toContain('accounts://connected');
      expect(uris).toContain('config://platforms');

      await client.close();
    });

    it('registers prompts', async () => {
      const server = createMcpServer(fullCtx);
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'test-client', version: '1.0.0' });

      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const result = await client.listPrompts();
      expect(result.prompts.length).toBeGreaterThan(0);
      const names = result.prompts.map((p) => p.name);
      expect(names).toContain('create-content-calendar');
      expect(names).toContain('analyze-engagement');
      expect(names).toContain('brand-voice-audit');
      expect(names).toContain('trending-to-content');

      await client.close();
    });
  });
});
