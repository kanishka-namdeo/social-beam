import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, persistConnectedAccount, enrichWithAccountInfo } from '@/lib/agent/tools/social-tools';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    const { searchParams } = req.nextUrl;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      log.warn('oauth.callback.error', { platform: 'unknown', oauthError: error });
      return NextResponse.redirect(
        new URL(`/onboarding?oauth=error&reason=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      log.warn('oauth.callback.missing_code');
      return NextResponse.redirect(
        new URL('/onboarding?oauth=error&reason=missing_code', req.url)
      );
    }

    let platform = 'unknown';
    let callbackCodeVerifier: string | undefined;
    let callbackWorkspaceId = workspaceId;
    let redirectTo = 'onboarding';

    if (stateParam) {
      try {
        const state = JSON.parse(decodeURIComponent(stateParam));
        platform = state.platform ?? 'unknown';
        callbackCodeVerifier = state.codeVerifier;
        if (state.workspaceId) callbackWorkspaceId = state.workspaceId;
        if (state.redirectTo) redirectTo = state.redirectTo;
      } catch {
        log.warn('oauth.callback.state_parse_failed');
      }
    }

    if (!callbackWorkspaceId) {
      log.warn('oauth.callback.missing_workspace_id');
      return NextResponse.redirect(
        new URL('/onboarding?oauth=error&reason=missing_workspace_id', req.url)
      );
    }

    log.info('oauth.callback.token_exchange_start', { platform });
    const userId = session.user.id ?? '';
    const tokenResult = await exchangeCodeForTokens(platform, code, callbackCodeVerifier, userId);
    if (!tokenResult.success) {
      log.error('oauth.callback.token_exchange_failed', { platform, error: tokenResult.error });
      return NextResponse.redirect(
        new URL(`/onboarding?oauth=error&reason=${encodeURIComponent(tokenResult.error ?? 'token_exchange_failed')}`, req.url)
      );
    }

    if (!tokenResult.accessToken || !tokenResult.platformUserId) {
      log.error('oauth.callback.missing_token_or_user_id', { platform });
      return NextResponse.redirect(
        new URL('/onboarding?oauth=error&reason=missing_token_or_user_id', req.url)
      );
    }

    // Fetch account info from platform APIs to get username, avatar, etc.
    const accountInfo = await enrichWithAccountInfo(platform, tokenResult.accessToken);

    const persistResult = await persistConnectedAccount({
      workspaceId: callbackWorkspaceId,
      platform,
      platformUserId: tokenResult.platformUserId,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.expiresIn,
      ...accountInfo,
    });

    if (!persistResult.success) {
      log.error('oauth.callback.persist_failed', { platform, error: persistResult.error });
      return NextResponse.redirect(
        new URL(`/onboarding?oauth=error&reason=${encodeURIComponent(persistResult.error ?? 'persist_failed')}`, req.url)
      );
    }

    log.info('oauth.callback.success', { platform });

    if (redirectTo === 'settings') {
      return NextResponse.redirect(
        new URL(`/settings?tab=accounts&oauth=success&platform=${platform}`, req.url)
      );
    }

    return NextResponse.redirect(
      new URL(`/onboarding?oauth=success&platform=${platform}`, req.url)
    );
  } catch (err) {
    logger.error('oauth.callback.unexpected_error', { requestId, error: String(err) });
    return NextResponse.redirect(new URL('/onboarding?oauth=error', req.url));
  }
}
