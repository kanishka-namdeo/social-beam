// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { signMcpToken, verifyMcpToken, McpAuthError } from '../auth';
import type { McpTokenPayload } from '../auth';

// Set test JWT secret before any tests run
beforeAll(() => {
  process.env.MCP_JWT_SECRET = 'test-mcp-jwt-secret-for-vitest-only';
});

describe('MCP Auth', () => {
  const testPayload: McpTokenPayload = {
    userId: 'user-123',
    workspaceId: 'ws-456',
    role: 'FREE_USER',
    scopes: ['mcp:accounts', 'mcp:compose'],
  };

  describe('signMcpToken', () => {
    it('creates a valid JWT string', async () => {
      const token = await signMcpToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyMcpToken', () => {
    it('extracts context from a valid token', async () => {
      const token = await signMcpToken(testPayload);
      const req = new Request('http://localhost:3000/api/mcp', {
        headers: { authorization: `Bearer ${token}` },
      });

      const ctx = await verifyMcpToken(req);
      expect(ctx.userId).toBe('user-123');
      expect(ctx.workspaceId).toBe('ws-456');
      expect(ctx.role).toBe('FREE_USER');
      expect(ctx.scopes).toEqual(['mcp:accounts', 'mcp:compose']);
    });

    it('throws McpAuthError for missing token', async () => {
      const req = new Request('http://localhost:3000/api/mcp');

      await expect(verifyMcpToken(req)).rejects.toThrow(McpAuthError);
      await expect(verifyMcpToken(req)).rejects.toMatchObject({
        errorCode: 'missing_token',
      });
    });

    it('throws McpAuthError for invalid token', async () => {
      const req = new Request('http://localhost:3000/api/mcp', {
        headers: { authorization: 'Bearer not-a-valid-jwt' },
      });

      await expect(verifyMcpToken(req)).rejects.toThrow(McpAuthError);
      await expect(verifyMcpToken(req)).rejects.toMatchObject({
        errorCode: 'invalid_token',
      });
    });

    it('throws McpAuthError for expired token', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(
        process.env.MCP_JWT_SECRET || 'test-mcp-jwt-secret-for-vitest-only'
      );
      const audience = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp`;
      const issuer = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const expiredToken = await new SignJWT({
        workspace_id: 'ws-456',
        role: 'FREE_USER',
        scope: 'mcp:accounts',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setIssuer(issuer)
        .setAudience(audience)
        .setSubject('user-123')
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(secret);

      const req = new Request('http://localhost:3000/api/mcp', {
        headers: { authorization: `Bearer ${expiredToken}` },
      });

      await expect(verifyMcpToken(req)).rejects.toThrow(McpAuthError);
      await expect(verifyMcpToken(req)).rejects.toMatchObject({
        errorCode: 'token_expired',
      });
    });
  });
});
