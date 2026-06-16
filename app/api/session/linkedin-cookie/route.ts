import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { launch } from "cloakbrowser";
import { encryptToken } from "@/lib/oauth/crypto";
import { resolveCredentials } from "@/lib/oauth/credentials";
import { getLinkedinAuthUrl } from "@/lib/oauth/platforms/linkedin";
import { withLinkedInPage, LinkedInCookieExpiredError } from "@/lib/linkedin/browser";
import { createFlow, getFlow, cleanupFlow, failFlow } from "@/lib/linkedin/unified-flow";

const CookieExtractSchema = z.object({
  platform: z.literal("linkedin"),
  action: z.enum(["start", "extract"]),
  sessionId: z.string().optional(),
  startOAuthAfterLogin: z.boolean().optional(),
});

// Poll intervals for login detection
const LOGIN_POLL_INTERVAL_MS = 5000;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting for browser launches (prevents resource exhaustion)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_START_ATTEMPTS = 3; // 3 browser launches per minute per user
const RATE_LIMIT_MAP_MAX_SIZE = 500;

const startAttempts = new Map<string, { count: number; resetTime: number }>();

function checkStartRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = startAttempts.get(userId);
  if (!record || now > record.resetTime) {
    startAttempts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    // Evict stale entries to prevent unbounded growth
    if (startAttempts.size > RATE_LIMIT_MAP_MAX_SIZE) {
      for (const [key, val] of startAttempts) {
        if (now > val.resetTime) {
          startAttempts.delete(key);
        }
      }
    }
    return true;
  }
  if (record.count >= MAX_START_ATTEMPTS) return false;
  record.count++;
  return true;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CookieExtractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { platform, action } = parsed.data;
    const userId = user.id ?? "";

    if (platform !== "linkedin") {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    if (action === "start") {
      if (!checkStartRateLimit(userId)) {
        log.warn("api.session.linkedin.rate_limited", { userId, workspaceId });
        return NextResponse.json(
          { error: "Too many browser launch attempts. Please try again in a minute." },
          { status: 429 },
        );
      }
      return await handleStartLogin(log, workspaceId, userId, parsed.data.startOAuthAfterLogin ?? false);
    }

    if (action === "extract") {
      return await handleExtractCookie(log, workspaceId, parsed.data.sessionId);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    log.error("api.session.linkedin.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Start a browser session for LinkedIn login.
 * When startOAuthAfterLogin is true, after the user logs in the browser
 * will be navigated to the LinkedIn OAuth consent screen. The user approves
 * OAuth in the same browser window — one login, one flow.
 */
async function handleStartLogin(
  log: typeof logger,
  workspaceId: string,
  userId: string,
  startOAuthAfterLogin: boolean,
): Promise<NextResponse> {
  log.info("api.session.linkedin.start_login", { workspaceId, startOAuthAfterLogin });

  let browser: any = null;
  try {
    // Launch browser with stealth mode for LinkedIn
    browser = await launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });

    // Tab 1: OAuth page — where user logs in and approves OAuth consent
    const oauthPage = await context.newPage();

    // Navigate to LinkedIn login on the OAuth page
    await oauthPage.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Tab 2: Cookie page — opened after login detection for silent cookie extraction
    const cookiePage = await context.newPage();

    const flowId = crypto.randomUUID();

    // Store flow state so the callback handler can access both pages
    createFlow(flowId, workspaceId, userId, browser, oauthPage, cookiePage);

    // Poll for login completion in background using the oauth page
    pollForLogin(oauthPage, cookiePage, workspaceId, flowId, userId, startOAuthAfterLogin, log).catch((err) => {
      log.error("api.session.linkedin.poll_error", { error: String(err) });
    });

    log.info("api.session.linkedin.start_login.complete", { workspaceId, flowId, startOAuthAfterLogin });

    return NextResponse.json({
      success: true,
      sessionId: flowId,
      flowId,
      message: "Browser opened. Please log in to LinkedIn.",
    });
  } catch (err) {
    log.error("api.session.linkedin.start_login.error", { error: String(err) });
    // Close browser if it was launched but flow setup failed
    if (browser) {
      await browser.close().catch((closeErr: any) => {
        log.warn("api.session.linkedin.browser_close_error", { error: String(closeErr) });
      });
    }
    return NextResponse.json(
      { error: "Failed to start browser session" },
      { status: 500 },
    );
  }
}

/**
 * Poll for successful login. After login is detected on the oauth page,
 * a second tab (cookie page) is navigated to LinkedIn to capture cookies.
 * If startOAuthAfterLogin is true, the oauth page is navigated to the
 * LinkedIn OAuth consent screen. Cookie extraction happens independently
 * on the cookie page so it never interferes with the OAuth redirect flow.
 */
async function pollForLogin(
  oauthPage: any,
  cookiePage: any,
  workspaceId: string,
  flowId: string,
  userId: string,
  startOAuthAfterLogin: boolean,
  log: typeof logger,
): Promise<void> {
  let loggedIn = false;
  const startTime = Date.now();

  while (Date.now() - startTime < LOGIN_TIMEOUT_MS) {
    try {
      const url = oauthPage.url();
      if (url.includes("/feed") || url.includes("/mynetwork") || url.includes("/jobs")) {
        loggedIn = true;
        log.info("api.session.linkedin.login_detected", { workspaceId, flowId, url });
        break;
      }
    } catch {
      // Page might have been closed or navigated
    }
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_INTERVAL_MS));
  }

  if (!loggedIn) {
    log.warn("api.session.linkedin.login_timeout", { workspaceId, flowId });
    // Clean up the entire flow (closes browser and removes from map)
    cleanupFlow(flowId);
    return;
  }

  // Navigate the cookie page to LinkedIn — it shares the browser context
  // so the login cookies are already available. Extract from this page.
  try {
    await cookiePage.goto("https://www.linkedin.com/feed", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    log.info("api.session.linkedin.cookie_page_loaded", { workspaceId, flowId });

    const result = await extractAndSaveCookie(cookiePage, workspaceId, flowId, log);

    // Restore focus to the oauth page so the user sees the OAuth consent screen
    try {
      await oauthPage.bringToFront();
    } catch {
      // Page may have been closed during OAuth redirect — ignore
    }
  } catch (err) {
    log.warn("api.session.linkedin.cookie_page_error", {
      workspaceId,
      flowId,
      error: String(err),
    });
  }

  if (startOAuthAfterLogin) {
    // Navigate the oauth page to the LinkedIn OAuth consent screen.
    // This happens on a separate tab so the OAuth redirect won't disrupt
    // the cookie extraction on the cookie page.
    await navigateToOAuth(oauthPage, workspaceId, userId, flowId, log);
  } else {
    // No OAuth flow requested, clean up the browser now
    log.info("api.session.linkedin.no_oauth_cleanup", { workspaceId, flowId });
    cleanupFlow(flowId);
  }
}

/**
 * Build the LinkedIn OAuth URL and navigate the oauth page to it.
 * The OAuth redirect will go to /api/linkedin/oauth-callback which
 * handles token exchange, cookie extraction, and flow completion.
 */
async function navigateToOAuth(
  oauthPage: any,
  workspaceId: string,
  userId: string,
  flowId: string,
  log: typeof logger,
): Promise<void> {
  try {
    const credentials = await resolveCredentials(userId, "linkedin");
    if (!credentials) {
      log.error("api.session.linkedin.oauth_no_credentials", { workspaceId, flowId });
      failFlow(flowId, "OAuth credentials not found");
      cleanupFlow(flowId);
      return;
    }

    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/linkedin/oauth-callback`;
    const state = JSON.stringify({ flowId, platform: "linkedin" });

    const authUrl = getLinkedinAuthUrl(redirectUri, state, credentials.clientId);

    log.info("api.session.linkedin.navigating_to_oauth", { workspaceId, flowId });

    await oauthPage.goto(authUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Update flow status to waiting_oauth
    const { getFlow } = await import("@/lib/linkedin/unified-flow");
    const flow = getFlow(flowId);
    if (flow) {
      flow.status = "waiting_oauth";
    }
  } catch (err) {
    const errorMessage = String(err);
    // ERR_ABORTED is the expected success path — it means LinkedIn redirected
    // to our OAuth callback. Don't treat it as a failure; the callback handler
    // will complete the flow and schedule cleanup.
    if (errorMessage.includes('ERR_ABORTED')) {
      log.info('api.session.linkedin.oauth_redirect_aborted', {
        workspaceId,
        flowId,
        message: 'Page redirected to OAuth callback (expected)',
      });
      return;
    }

    log.error('api.session.linkedin.oauth_navigation_failed', {
      workspaceId,
      flowId,
      error: errorMessage,
    });

    // Only fail if the flow hasn't already been completed by the OAuth callback
    const { getFlow } = await import('@/lib/linkedin/unified-flow');
    const flow = getFlow(flowId);
    if (flow && flow.status !== 'complete') {
      failFlow(flowId, 'OAuth navigation failed');
      cleanupFlow(flowId);
    } else if (flow) {
      log.info('api.session.linkedin.skip_cleanup_flow_already_complete', { workspaceId, flowId });
    }
  }
}

/**
 * Extract the li_at cookie from the browser and save it to the flow state.
 * The cookie is later applied when the ConnectedAccount record is created
 * in the OAuth callback handler. Used by both the legacy flow and the
 * unified OAuth callback.
 */
export async function extractAndSaveCookie(
  page: any,
  workspaceId: string,
  flowId: string,
  log: typeof logger,
): Promise<{ success: boolean; cookieExpiry?: Date }> {
  try {
    const cookies = await page.context().cookies();
    const liAtCookie = cookies.find((c: any) => c.name === "li_at");

    if (!liAtCookie?.value) {
      log.error("api.session.linkedin.cookie_not_found", { workspaceId, flowId });
      return { success: false };
    }

    const cookieExpiry = new Date();
    cookieExpiry.setFullYear(cookieExpiry.getFullYear() + 1);

    // Store the raw cookie in flow state so it can be applied when the
    // ConnectedAccount record is created in the OAuth callback.
    const flow = getFlow(flowId);
    if (flow) {
      flow.sessionCookie = liAtCookie.value;
      flow.cookieExpiry = cookieExpiry;
      log.info("api.session.linkedin.cookie_stored_in_flow", { workspaceId, flowId });
    } else {
      log.warn("api.session.linkedin.cookie_flow_not_found", { workspaceId, flowId });
    }

    // Legacy path: also try to update existing records directly (backward compat)
    const encryptedCookie = encryptToken(liAtCookie.value);
    await prisma.connectedAccount.updateMany({
      where: {
        workspaceId,
        platform: "linkedin",
      },
      data: {
        sessionCookie: encryptedCookie,
        cookieExpiry,
      },
    });

    log.info("api.session.linkedin.cookie_saved", { workspaceId, flowId });
    return { success: true, cookieExpiry };
  } catch (err) {
    log.error("api.session.linkedin.cookie_save_error", { error: String(err) });
    return { success: false };
  }
}

/**
 * Extract cookie from an already-running session (fallback method).
 */
async function handleExtractCookie(
  log: typeof logger,
  workspaceId: string,
  sessionId?: string,
): Promise<NextResponse> {
  log.info("api.session.linkedin.extract_cookie", { workspaceId, sessionId });

  try {
    const result = await withLinkedInPage(async (page) => {
      const pageUrl = page.url();
      const isLoggedIn = !pageUrl.includes("/login") && !pageUrl.includes("/uas/oauth");

      if (!isLoggedIn) {
        return {
          success: false,
          message: "Not logged in to LinkedIn",
        };
      }

      // Extract cookie
      const cookies = await page.context().cookies();
      const liAtCookie = cookies.find((c: any) => c.name === "li_at");

      if (!liAtCookie?.value) {
        return {
          success: false,
          message: "li_at cookie not found",
        };
      }

      // Encrypt and store
      const encryptedCookie = encryptToken(liAtCookie.value);
      const cookieExpiry = new Date();
      cookieExpiry.setFullYear(cookieExpiry.getFullYear() + 1);

      await prisma.connectedAccount.updateMany({
        where: {
          workspaceId,
          platform: "linkedin",
        },
        data: {
          sessionCookie: encryptedCookie,
          cookieExpiry,
        },
      });

      log.info("api.session.linkedin.cookie_extracted", { workspaceId });

      return {
        success: true,
        message: "LinkedIn session cookie saved successfully",
      };
    });

    if (!result) {
      return NextResponse.json({
        success: false,
        message: "No active LinkedIn session found",
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LinkedInCookieExpiredError) {
      log.info("api.session.linkedin.cookie_expired", { workspaceId });
      return NextResponse.json({
        success: false,
        message: "LinkedIn session expired — please reconnect your account",
      });
    }
    throw err;
  }
}
