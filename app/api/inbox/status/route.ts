import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withLinkedInPage, shutdownBrowser, LinkedInCookieExpiredError } from "@/lib/linkedin/browser";

const StatusSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(["READ", "DISMISSED"]),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.status.start", { method: "POST", path: "/api/inbox/status" });

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
    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ids, status: newStatus } = parsed.data;

    await prisma.engagementItem.updateMany({
      where: {
        id: { in: ids },
        workspaceId,
      },
      data: { status: newStatus },
    });

    log.info("api.inbox.status.complete", {
      workspaceId,
      count: ids.length,
      status: newStatus,
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    log.error("api.inbox.status.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/inbox/status?platform=linkedin
 * Returns the cookie validity status for LinkedIn browser scraping.
 */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");

    if (platform !== "linkedin") {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info("api.inbox.linkedin_cookie_check.start");

    try {
      const result = await withLinkedInPage(async (page) => {
        const pageUrl = page.url();
        const isLoggedIn = !pageUrl.includes("/login") && !pageUrl.includes("/uas/oauth");
        return {
          cookieValid: isLoggedIn,
          connected: isLoggedIn,
          message: isLoggedIn ? "LinkedIn session is active" : "LinkedIn cookie expired — run scripts/extract-linkedin-cookie.mjs",
        };
      });

      if (!result) {
        return NextResponse.json({
          cookieValid: false,
          connected: false,
          message: "No li_at cookie found. Run scripts/extract-linkedin-cookie.mjs or set LINKEDIN_LI_AT_COOKIE env var.",
        });
      }

      log.info("api.inbox.linkedin_cookie_check.complete", { cookieValid: result.cookieValid });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof LinkedInCookieExpiredError) {
        log.info("api.inbox.linkedin_cookie_check.expired");
        return NextResponse.json({
          cookieValid: false,
          connected: false,
          message: "LinkedIn cookie expired — run scripts/extract-linkedin-cookie.mjs",
        });
      }
      throw err;
    } finally {
      // Clean up browser process after check
      await shutdownBrowser();
    }
  } catch (err) {
    log.error("api.inbox.linkedin_cookie_check.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
