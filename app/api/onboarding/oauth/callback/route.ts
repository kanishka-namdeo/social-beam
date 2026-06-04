import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, persistConnectedAccount, enrichWithAccountInfo } from '@/lib/agent/tools/social-tools';
import { logger } from '@/lib/logger';
import { encryptToken } from '@/lib/oauth/crypto';
import { prisma } from '@/lib/prisma';

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

    // For LinkedIn, automatically extract the li_at session cookie in the background
    // so analytics scraping works without requiring a manual "Connect Session" step.
    if (platform.toLowerCase() === 'linkedin') {
      extractLinkedInSessionCookie(callbackWorkspaceId, log).catch((err) => {
        log.error('oauth.callback.linkedin_cookie_extraction_background_failed', {
          workspaceId: callbackWorkspaceId,
          error: String(err),
        });
      });
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

/**
 * Extract and store the LinkedIn li_at session cookie after OAuth connection.
 * Opens a headless browser, prompts the user to log in via the onboarding UI,
 * and polls for the cookie. This runs as a fire-and-forget background task.
 */
async function extractLinkedInSessionCookie(
  workspaceId: string,
  log: ReturnType<typeof logger['child']>,
): Promise<void> {
  const LOGIN_POLL_INTERVAL_MS = 5000;
  const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

  log.info('oauth.callback.linkedin.cookie_extraction_start', { workspaceId });

  // Launch a headless browser that navigates to LinkedIn
  const { launch } = await import('cloakbrowser');
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  log.info('oauth.callback.linkedin.browser_opened', { workspaceId });

  let loggedIn = false;
  const startTime = Date.now();

  while (Date.now() - startTime < LOGIN_TIMEOUT_MS) {
    try {
      const url = page.url();
      if (url.includes('/feed') || url.includes('/mynetwork') || url.includes('/jobs')) {
        loggedIn = true;
        log.info('oauth.callback.linkedin.login_detected', { workspaceId, url });
        break;
      }
    } catch {
      // Page might have been closed or navigated
    }
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_INTERVAL_MS));
  }

  if (!loggedIn) {
    log.warn('oauth.callback.linkedin.login_timeout', { workspaceId });
    await browser.close();
    return;
  }

  // Extract the li_at cookie
  try {
    const cookies = await page.context().cookies();
    const liAtCookie = cookies.find((c: any) => c.name === 'li_at');

    if (!liAtCookie?.value) {
      log.error('oauth.callback.linkedin.cookie_not_found', { workspaceId });
      await browser.close();
      return;
    }

    // Encrypt and store the cookie in ConnectedAccount
    const encryptedCookie = encryptToken(liAtCookie.value);
    const cookieExpiry = new Date();
    cookieExpiry.setFullYear(cookieExpiry.getFullYear() + 1);

    await prisma.connectedAccount.updateMany({
      where: {
        workspaceId,
        platform: 'linkedin',
      },
      data: {
        sessionCookie: encryptedCookie,
        cookieExpiry,
      },
    });

    log.info('oauth.callback.linkedin.cookie_saved', { workspaceId });
  } catch (err) {
    log.error('oauth.callback.linkedin.cookie_save_error', { error: String(err) });
  } finally {
    await browser.close();
  }
}
