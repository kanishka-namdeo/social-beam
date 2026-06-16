import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { resolveCredentials } from '@/lib/oauth/credentials';
import { exchangeLinkedinToken, getLinkedinAccountInfo } from '@/lib/oauth/platforms/linkedin';
import { encryptToken } from '@/lib/oauth/crypto';
import { getFlow, completeFlow, failFlow, cleanupFlow } from '@/lib/linkedin/unified-flow';
import { importLinkedinPosts } from '@/lib/analytics/linkedin-import';
import { startActivity, completeActivity, failActivity } from '@/lib/activity-tracker';
import { ActivityType } from '@/app/generated/prisma';

/**
 * OAuth callback for the unified LinkedIn connection flow.
 * 
 * After the user logs in and approves OAuth in the CloakBrowser,
 * LinkedIn redirects to this endpoint with the auth code.
 * 
 * This handler:
 * 1. Exchanges the code for tokens
 * 2. Persists the connected account
 * 3. Extracts the li_at cookie from the browser
 * 4. Triggers the initial post import
 * 5. Shows a success page and closes the browser
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });
  let flowId: string | undefined;

  try {
    const { searchParams } = req.nextUrl;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      log.warn('linkedin.oauth_callback.error', { oauthError: error });
      return renderErrorPage(`OAuth error: ${error}`);
    }

    if (!code) {
      log.warn('linkedin.oauth_callback.missing_code');
      return renderErrorPage('Missing authorization code');
    }

    if (!stateParam) {
      log.warn('linkedin.oauth_callback.missing_state');
      return renderErrorPage('Missing state parameter');
    }

    // Parse state to get flowId
    try {
      const state = JSON.parse(decodeURIComponent(stateParam));
      flowId = state.flowId;
      if (!flowId) {
        log.warn('linkedin.oauth_callback.missing_flow_id');
        return renderErrorPage('Missing flow ID in state');
      }
    } catch (err) {
      log.error('linkedin.oauth_callback.state_parse_failed', { error: String(err) });
      return renderErrorPage('Invalid state parameter');
    }

    // Look up the flow state
    const flow = getFlow(flowId);
    if (!flow) {
      log.warn('linkedin.oauth_callback.flow_not_found', { flowId });
      return renderErrorPage('Flow not found or expired. Please try again.');
    }

    const { workspaceId, userId } = flow;
    log.info('linkedin.oauth_callback.start', { flowId, workspaceId });

    // Resolve credentials
    const credentials = await resolveCredentials(userId, 'linkedin');
    if (!credentials) {
      log.error('linkedin.oauth_callback.no_credentials', { flowId, workspaceId });
      failFlow(flowId, 'OAuth credentials not found');
      cleanupFlow(flowId); // Clean up browser immediately on error
      return renderErrorPage('OAuth not configured. Please configure your LinkedIn app credentials.');
    }

    // Exchange code for tokens
    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/linkedin/oauth-callback`;

    let tokenResult;
    try {
      tokenResult = await exchangeLinkedinToken(
        code,
        redirectUri,
        credentials.clientId,
        credentials.clientSecret,
      );
    } catch (err) {
      log.error('linkedin.oauth_callback.token_exchange_failed', {
        flowId,
        workspaceId,
        error: String(err),
      });
      failFlow(flowId, 'Token exchange failed');
      cleanupFlow(flowId); // Clean up browser immediately on error
      return renderErrorPage('Failed to exchange authorization code for tokens.');
    }

    // Get account info
    let accountInfo;
    try {
      accountInfo = await getLinkedinAccountInfo(tokenResult.accessToken);
    } catch (err) {
      log.error('linkedin.oauth_callback.account_info_failed', {
        flowId,
        workspaceId,
        error: String(err),
      });
      failFlow(flowId, 'Failed to fetch account info');
      cleanupFlow(flowId); // Clean up browser immediately on error
      return renderErrorPage('Failed to fetch LinkedIn account information.');
    }

    // Persist the connected account
    const encryptedAccessToken = encryptToken(tokenResult.accessToken);
    const encryptedRefreshToken = tokenResult.refreshToken
      ? encryptToken(tokenResult.refreshToken)
      : null;

    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + (tokenResult.expiresIn ?? 3600));

    // Apply session cookie from flow state (captured during pollForLogin, before OAuth redirect)
    const persistedSessionCookie = flow.sessionCookie
      ? encryptToken(flow.sessionCookie)
      : null;

    try {
      await prisma.connectedAccount.upsert({
        where: {
          workspaceId_platform: {
            workspaceId,
            platform: 'linkedin',
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          ...(encryptedRefreshToken ? { refreshToken: encryptedRefreshToken } : {}),
          ...(persistedSessionCookie ? { sessionCookie: persistedSessionCookie, cookieExpiry: flow.cookieExpiry } : {}),
          tokenExpiry,
          platformUserId: accountInfo.platformUserId,
          platformUsername: accountInfo.platformUsername,
          status: 'connected',
          lastRefreshAt: new Date(),
        },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          platform: 'linkedin',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken ?? '',
          tokenExpiry,
          platformUserId: accountInfo.platformUserId,
          platformUsername: accountInfo.platformUsername ?? '',
          status: 'connected',
          sessionCookie: persistedSessionCookie ?? null,
          cookieExpiry: flow.cookieExpiry ?? null,
        },
      });

      log.info('linkedin.oauth_callback.account_persisted', {
        flowId,
        workspaceId,
        platformUserId: accountInfo.platformUserId,
        hasSessionCookie: !!persistedSessionCookie,
      });
    } catch (err) {
      log.error('linkedin.oauth_callback.persist_failed', {
        flowId,
        workspaceId,
        error: String(err),
      });
      failFlow(flowId, 'Failed to save account');
      cleanupFlow(flowId); // Clean up browser immediately on error
      return renderErrorPage('Failed to save connected account.');
    }

    // Extract the li_at cookie from the browser (already captured by the cookie page)
    // The cookie has already been extracted and saved by pollForLogin, so we just log it
    log.info("linkedin.oauth_callback.cookie_already_extracted", { flowId, workspaceId });

    // Trigger the initial post import
    const activityId = await startActivity(workspaceId, ActivityType.LINKEDIN_IMPORT, {
      platformUserId: accountInfo.platformUserId,
      source: 'oauth_callback',
    });

    try {
      log.info('linkedin.oauth_callback.import_start', { flowId, workspaceId });
      const result = await importLinkedinPosts(
        workspaceId,
        tokenResult.accessToken,
        accountInfo.platformUserId,
        'personal',
      );
      await completeActivity(activityId, {
        postsSynced: result.postsSynced,
        snapshotsCreated: result.snapshotsCreated,
        followerSnapshotCreated: result.followerSnapshotCreated,
      });
      log.info('linkedin.oauth_callback.import_success', { flowId, workspaceId });
    } catch (err) {
      log.error('linkedin.oauth_callback.import_failed', {
        flowId,
        workspaceId,
        error: String(err),
      });
      await failActivity(activityId, err instanceof Error ? err.message : String(err));
      // Don't fail the flow — import can be retried by cron
    }

    // Mark flow as complete (schedules cleanup via completeFlow)
    completeFlow(flowId, accountInfo.platformUserId);

    // Render success page
    return renderSuccessPage();
  } catch (err) {
    log.error('linkedin.oauth_callback.unexpected_error', {
      requestId,
      error: String(err),
    });
    if (flowId) {
      failFlow(flowId, 'Unexpected error in OAuth callback');
      cleanupFlow(flowId);
    }
    return renderErrorPage('An unexpected error occurred.');
  }
}

function renderSuccessPage(): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .checkmark {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
    .countdown {
      margin-top: 1rem;
      font-size: 0.875rem;
      opacity: 0.7;
    }
  </style>
  <script>
    setTimeout(() => {
      window.close();
    }, 3000);
  </script>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>LinkedIn Connected!</h1>
    <p>Your account has been successfully connected.</p>
    <p class="countdown">This window will close automatically...</p>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderErrorPage(message: string): NextResponse {
  const escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
    .close-btn {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  </style>
  <script>
    function closeWindow() {
      window.close();
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="error-icon">✕</div>
    <h1>Connection Failed</h1>
    <p>${escapedMessage}</p>
    <button class="close-btn" onclick="closeWindow()">Close Window</button>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
