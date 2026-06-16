// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/role-guard', () => ({
  ROLE_HIERARCHY: { ADMIN: 3, PREMIUM_USER: 2, FREE_USER: 1 },
  resolveUserRole: vi.fn(),
}));

import { filterScopesByRole } from '../scope-resolver';

describe('filterScopesByRole', () => {
  const allScopes = ['mcp:accounts', 'mcp:compose', 'mcp:analytics', 'mcp:brand', 'mcp:inbox', 'mcp:publish', 'mcp:reddit', 'mcp:ai-tools'];

  it('strips mcp:ai-tools for FREE_USER', () => {
    const result = filterScopesByRole(allScopes, 'FREE_USER');
    expect(result).not.toContain('mcp:ai-tools');
    expect(result).toHaveLength(7);
  });

  it('keeps mcp:ai-tools for PREMIUM_USER', () => {
    const result = filterScopesByRole(allScopes, 'PREMIUM_USER');
    expect(result).toContain('mcp:ai-tools');
    expect(result).toHaveLength(8);
  });

  it('keeps mcp:ai-tools for ADMIN', () => {
    const result = filterScopesByRole(allScopes, 'ADMIN');
    expect(result).toContain('mcp:ai-tools');
    expect(result).toHaveLength(8);
  });

  it('handles empty scope list', () => {
    const result = filterScopesByRole([], 'FREE_USER');
    expect(result).toEqual([]);
  });

  it('handles scopes without mcp:ai-tools', () => {
    const basicScopes = ['mcp:accounts', 'mcp:compose'];
    const result = filterScopesByRole(basicScopes, 'FREE_USER');
    expect(result).toEqual(basicScopes);
  });
});
