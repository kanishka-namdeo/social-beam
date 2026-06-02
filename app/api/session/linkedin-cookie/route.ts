import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { launch } from "cloakbrowser";
import { encryptToken } from "@/lib/oauth/crypto";
import { withLinkedInPage, LinkedInCookieExpiredError } from "@/lib/linkedin/browser";

const CookieExtractSchema = z.object({
  platform: z.literal("linkedin"),
  action: z.enum(["start", "extract"]),
  sessionId: z.string().optional(),
});

// Poll intervals for login detection
const LOGIN_POLL_INTERVAL_MS = 5000;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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

    if (platform !== "linkedin") {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    if (action === "start") {
      return await handleStartLogin(log, workspaceId);
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
 * Start a browser session and return the LinkedIn login URL.
 * User should open this URL in a visible browser to log in manually.
 */
async function handleStartLogin(
  log: typeof logger,
  workspaceId: string,
): Promise<NextResponse> {
  log.info("api.session.linkedin.start_login", { workspaceId });

  try {
    // Launch browser with stealth mode for LinkedIn
    const browser = await launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // Navigate to LinkedIn login
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Generate a session ID for this extraction attempt
    const sessionId = crypto.randomUUID();

    // Poll for login completion in background
    pollForLogin(page, workspaceId, sessionId, log).catch((err) => {
      log.error("api.session.linkedin.poll_error", { error: String(err) });
    });

    log.info("api.session.linkedin.start_login.complete", { workspaceId, sessionId });

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Browser opened. Please log in to LinkedIn.",
    });
  } catch (err) {
    log.error("api.session.linkedin.start_login.error", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to start browser session" },
      { status: 500 },
    );
  }
}

/**
 * Poll for successful login and extract the li_at cookie.
 */
async function pollForLogin(
  page: any,
  workspaceId: string,
  sessionId: string,
  log: typeof logger,
): Promise<void> {
  let loggedIn = false;
  const startTime = Date.now();

  while (Date.now() - startTime < LOGIN_TIMEOUT_MS) {
    try {
      const url = page.url();
      if (url.includes("/feed") || url.includes("/mynetwork") || url.includes("/jobs")) {
        loggedIn = true;
        log.info("api.session.linkedin.login_detected", { workspaceId, url });
        break;
      }
    } catch {
      // Page might have been closed or navigated
    }
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_INTERVAL_MS));
  }

  if (!loggedIn) {
    log.warn("api.session.linkedin.login_timeout", { workspaceId, sessionId });
    await page.close();
    return;
  }

  // Extract the li_at cookie
  try {
    const cookies = await page.context().cookies();
    const liAtCookie = cookies.find((c: any) => c.name === "li_at");

    if (!liAtCookie?.value) {
      log.error("api.session.linkedin.cookie_not_found", { workspaceId });
      await page.close();
      return;
    }

    // Encrypt and store the cookie
    const encryptedCookie = encryptToken(liAtCookie.value);
    const cookieExpiry = new Date();
    cookieExpiry.setFullYear(cookieExpiry.getFullYear() + 1); // Cookies last ~1 year

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

    log.info("api.session.linkedin.cookie_saved", { workspaceId, sessionId });
  } catch (err) {
    log.error("api.session.linkedin.cookie_save_error", { error: String(err) });
  } finally {
    await page.close();
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
