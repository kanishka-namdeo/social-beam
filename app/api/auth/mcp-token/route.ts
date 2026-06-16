import { signMcpToken, signMcpRefreshToken, verifyMcpRefreshToken } from '@/lib/mcp/auth';
import { atomicConsumeAuthorizationCode, cleanupExpiredCodes } from '@/lib/mcp/authorization-codes';
import { resolveMcpScopes } from '@/lib/mcp/scope-resolver';

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const computed = base64UrlEncode(hash);
  return computed === codeChallenge;
}

export async function POST(req: Request) {
  const body = await req.formData();
  const grantType = body.get('grant_type');

  await cleanupExpiredCodes();

  if (grantType === 'authorization_code') {
    const code = body.get('code') as string;
    const redirectUri = body.get('redirect_uri') as string;
    const clientId = body.get('client_id') as string;
    const codeVerifier = body.get('code_verifier') as string;

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return Response.json(
        { error: 'invalid_request', error_description: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const authCode = await atomicConsumeAuthorizationCode(code);
    if (!authCode) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Invalid or already consumed authorization code' },
        { status: 400 }
      );
    }

    if (Date.now() > authCode.expiresAt) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Authorization code has expired' },
        { status: 400 }
      );
    }

    if (authCode.redirectUri !== redirectUri) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      );
    }

    if (authCode.clientId !== clientId) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Client ID mismatch' },
        { status: 400 }
      );
    }

    const isValidChallenge = await verifyCodeChallenge(codeVerifier, authCode.codeChallenge);
    if (!isValidChallenge) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Invalid code verifier' },
        { status: 400 }
      );
    }

    const tokenPayload = {
      userId: authCode.userId,
      workspaceId: authCode.workspaceId,
      role: authCode.role,
      scopes: authCode.scopes,
    };

    const accessToken = await signMcpToken(tokenPayload);
    const refreshToken = await signMcpRefreshToken(tokenPayload);

    return Response.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scopes.join(' '),
    });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.get('refresh_token') as string;

    if (!refreshToken) {
      return Response.json(
        { error: 'invalid_request', error_description: 'Missing refresh_token parameter' },
        { status: 400 }
      );
    }

    try {
      const ctx = await verifyMcpRefreshToken(refreshToken);

      // Re-resolve scopes based on current role (handles upgrades/downgrades)
      const { scopes: currentScopes, role: currentRole } = await resolveMcpScopes(ctx.userId, ctx.scopes);

      const tokenPayload = {
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        role: currentRole,
        scopes: currentScopes,
      };

      const newAccessToken = await signMcpToken(tokenPayload);
      const newRefreshToken = await signMcpRefreshToken(tokenPayload);

      return Response.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken,
        scope: currentScopes.join(' '),
      });
    } catch (error) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Invalid or expired refresh token' },
        { status: 400 }
      );
    }
  }

  return Response.json(
    { error: 'unsupported_grant_type', error_description: 'Only authorization_code and refresh_token are supported' },
    { status: 400 }
  );
}
