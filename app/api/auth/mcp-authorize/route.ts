import { auth } from '@/lib/auth';
import { MCP_SCOPES } from '@/lib/mcp/types';
import { storeAuthorizationCode, cleanupExpiredCodes } from '@/lib/mcp/authorization-codes';
import { resolveMcpScopes } from '@/lib/mcp/scope-resolver';
import { isMcpClientAllowed, getRegisteredRedirectUris } from '@/lib/mcp/auth';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  // Clean up expired/abandoned authorization codes on each request
  // This is a lightweight cleanup that runs opportunistically
  try {
    await cleanupExpiredCodes();
  } catch {
    // Ignore cleanup errors - don't block authorization flow
  }

  const { searchParams } = new URL(req.url);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const scope = searchParams.get('scope') || '';
  const state = searchParams.get('state') || '';

  if (!clientId || !redirectUri || !responseType || !codeChallenge) {
    log.warn('api.mcp-authorize.invalid_request', { clientId, redirectUri: !!redirectUri, responseType, codeChallenge: !!codeChallenge });
    return new Response(
      JSON.stringify({ error: 'invalid_request', error_description: 'Missing required parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (responseType !== 'code') {
    log.warn('api.mcp-authorize.unsupported_response_type', { responseType });
    return new Response(
      JSON.stringify({ error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (codeChallengeMethod !== 'S256') {
    log.warn('api.mcp-authorize.invalid_challenge_method', { codeChallengeMethod });
    return new Response(
      JSON.stringify({ error: 'invalid_request', error_description: 'Only S256 code_challenge_method is supported' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // CRITICAL: Validate client_id against allowlist
  if (!isMcpClientAllowed(clientId)) {
    log.error('api.mcp-authorize.unauthorized_client', { clientId });
    return new Response(
      JSON.stringify({ error: 'unauthorized_client', error_description: 'Client ID is not registered' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // CRITICAL: Validate redirect_uri against registered URIs for this client
  const registeredUris = getRegisteredRedirectUris(clientId);
  if (!registeredUris.includes(redirectUri)) {
    log.error('api.mcp-authorize.invalid_redirect_uri', { clientId, redirectUri });
    return new Response(
      JSON.stringify({ error: 'invalid_redirect_uri', error_description: 'Redirect URI is not registered for this client' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const requestedScopes = scope.split(' ').filter(s => s && MCP_SCOPES.includes(s as any));
  if (requestedScopes.length === 0) {
    return new Response(
      JSON.stringify({ error: 'invalid_scope', error_description: 'No valid MCP scopes requested' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL('/api/auth/signin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    loginUrl.searchParams.set('callbackUrl', req.url);
    return Response.redirect(loginUrl.toString(), 302);
  }

  const userId = session.user.id as string;
  const { scopes: grantedScopes, role } = await resolveMcpScopes(userId, requestedScopes);

  if (grantedScopes.length === 0) {
    return new Response(
      JSON.stringify({ error: 'invalid_scope', error_description: 'No scopes available for your account tier' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const code = crypto.randomUUID();
  const workspaceId = session.user.workspaceId as string;

  await storeAuthorizationCode(code, {
    userId,
    workspaceId,
    role,
    scopes: grantedScopes,
    codeChallenge,
    redirectUri,
    clientId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return Response.redirect(redirectUrl.toString(), 302);
}
