import { PREMIUM_MCP_SCOPES } from './types';
import { ROLE_HIERARCHY, type UserRole } from '@/lib/role-guard';
import { resolveUserRole } from '@/lib/role-guard';

/**
 * Filters requested MCP scopes based on the user's current role.
 * Premium-only scopes are stripped for FREE_USER, silently granted for PREMIUM_USER/ADMIN.
 */
export function filterScopesByRole(requestedScopes: string[], role: UserRole): string[] {
  const roleLevel = ROLE_HIERARCHY[role];
  const premiumLevel = ROLE_HIERARCHY['PREMIUM_USER'];

  return requestedScopes.filter((scope) => {
    if (PREMIUM_MCP_SCOPES.includes(scope) && roleLevel < premiumLevel) {
      return false;
    }
    return true;
  });
}

/**
 * Resolves the user's current role from DB and returns filtered scopes.
 * Used during authorization and token refresh to ensure scopes match current role.
 */
export async function resolveMcpScopes(userId: string, requestedScopes: string[]): Promise<{ scopes: string[]; role: UserRole }> {
  const role = await resolveUserRole(userId);
  const scopes = filterScopesByRole(requestedScopes, role);
  return { scopes, role };
}
