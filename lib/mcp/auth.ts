import { SignJWT, jwtVerify, errors } from 'jose';
import type { McpUserContext } from './types';
import { isTokenRevokedByJti } from './token-revocation';

const getSecret = () => {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret) {
    throw new Error('MCP_JWT_SECRET environment variable is required. Generate one with: openssl rand -base64 32');
  }
  return new TextEncoder().encode(secret);
};

const getAudience = () => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp`;
const getIssuer = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * MCP OAuth 2.0 client registry.
 *
 * Clients are configured via environment variables:
 * - MCP_ALLOWED_CLIENT_IDS: Comma-separated list of allowed client_id values
 * - MCP_CLIENT_REDIRECT_URIS: JSON object mapping client_id -> array of allowed redirect URIs
 *
 * Example:
 *   MCP_ALLOWED_CLIENT_IDS=cursor-vscode,cursor-jetbrains
 *   MCP_CLIENT_REDIRECT_URIS={"cursor-vscode":["https://insiders.vscode.dev/redirect","http://localhost:3000/callback"],"cursor-jetbrains":["http://localhost:63342/callback"]}
 */

function getAllowedClientIds(): string[] {
  const raw = process.env.MCP_ALLOWED_CLIENT_IDS;
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getClientRedirectUris(): Record<string, string[]> {
  const raw = process.env.MCP_CLIENT_REDIRECT_URIS;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Checks whether the given client_id is in the allowlist.
 */
export function isMcpClientAllowed(clientId: string): boolean {
  const allowed = getAllowedClientIds();
  if (allowed.length === 0) {
    // If no allowlist configured, reject all clients (fail-closed)
    return false;
  }
  return allowed.includes(clientId);
}

/**
 * Returns the list of registered redirect URIs for a given client_id.
 */
export function getRegisteredRedirectUris(clientId: string): string[] {
  const uriMap = getClientRedirectUris();
  return uriMap[clientId] ?? [];
}

export class McpAuthError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(errorCode: string, message: string, statusCode = 401) {
    super(message);
    this.name = 'McpAuthError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export async function verifyMcpToken(req: Request): Promise<McpUserContext> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new McpAuthError(
      'missing_token',
      'Missing or invalid Authorization header. Expected: Bearer <token>',
      401
    );
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: getIssuer(),
      audience: getAudience(),
    });

    // Check revocation via JTI claim
    const jti = payload.jti as string | undefined;
    if (jti) {
      const revoked = await isTokenRevokedByJti(jti);
      if (revoked) {
        throw new McpAuthError('token_revoked', 'Token has been revoked', 401);
      }
    }

    const userId = payload.sub;
    const workspaceId = payload.workspace_id as string | undefined;
    const role = payload.role as string | undefined;
    const scope = payload.scope as string | undefined;

    if (!userId || !workspaceId) {
      throw new McpAuthError('invalid_token', 'Token missing required claims (sub, workspace_id)', 401);
    }

    return {
      userId,
      workspaceId,
      role: role || 'user',
      scopes: scope ? scope.split(' ') : [],
    };
  } catch (error) {
    if (error instanceof McpAuthError) {
      throw error;
    }

    if (error instanceof errors.JWTExpired) {
      throw new McpAuthError('token_expired', 'Access token has expired', 401);
    }

    if (error instanceof errors.JWTClaimValidationFailed) {
      throw new McpAuthError('invalid_token', `Token validation failed: ${error.message}`, 401);
    }

    if (error instanceof errors.JWSSignatureVerificationFailed) {
      throw new McpAuthError('invalid_signature', 'Token signature verification failed', 401);
    }

    throw new McpAuthError('invalid_token', 'Failed to verify access token', 401);
  }
}

export interface McpTokenPayload {
  userId: string;
  workspaceId: string;
  role: string;
  scopes: string[];
}

export async function signMcpToken(payload: McpTokenPayload): Promise<string> {
  const jwt = await new SignJWT({
    workspace_id: payload.workspaceId,
    role: payload.role,
    scope: payload.scopes.join(' '),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer(getIssuer())
    .setAudience(getAudience())
    .setSubject(payload.userId)
    .setExpirationTime('1h')
    .sign(getSecret());

  return jwt;
}

export async function signMcpRefreshToken(payload: McpTokenPayload): Promise<string> {
  const jwt = await new SignJWT({
    workspace_id: payload.workspaceId,
    role: payload.role,
    scope: payload.scopes.join(' '),
    token_type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer(getIssuer())
    .setAudience(getAudience())
    .setSubject(payload.userId)
    .setExpirationTime('30d')
    .sign(getSecret());

  return jwt;
}

export async function verifyMcpRefreshToken(token: string): Promise<McpUserContext> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: getIssuer(),
      audience: getAudience(),
    });

    if (payload.token_type !== 'refresh') {
      throw new McpAuthError('invalid_token', 'Token is not a refresh token', 400);
    }

    const userId = payload.sub;
    const workspaceId = payload.workspace_id as string | undefined;
    const role = payload.role as string | undefined;
    const scope = payload.scope as string | undefined;

    if (!userId || !workspaceId) {
      throw new McpAuthError('invalid_token', 'Refresh token missing required claims', 400);
    }

    return {
      userId,
      workspaceId,
      role: role || 'user',
      scopes: scope ? scope.split(' ') : [],
    };
  } catch (error) {
    if (error instanceof McpAuthError) {
      throw error;
    }

    if (error instanceof errors.JWTExpired) {
      throw new McpAuthError('token_expired', 'Refresh token has expired', 400);
    }

    throw new McpAuthError('invalid_token', 'Failed to verify refresh token', 400);
  }
}
