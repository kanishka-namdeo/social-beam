/**
 * Test API: Compare headless vs visible browser for LinkedIn scraping.
 * Access via: curl http://localhost:3001/api/test-headless-vs-visible
 */
import { NextResponse } from "next/server";
import { withLinkedInPage, withLinkedInPageForUser, shutdownBrowser } from "@/lib/linkedin/browser";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const account = await prisma.connectedAccount.findFirst({
      where: { platform: "linkedin", status: "connected" },
    });

    if (!account) {
      return NextResponse.json({ error: "No LinkedIn account found" }, { status: 400 });
    }

    const workspaceId = account.workspaceId;
    logger.info("test.headless_vs_visible.start", { workspaceId });

    // Test 1: Headless browser (fallback)
    let headlessResult: any;
    try {
      headlessResult = await withLinkedInPage(async (page) => {
        const url = page.url();
        const title = await page.title();
        const isLoggedIn = !url.includes("/login") && !url.includes("/uas/oauth");
        return { url, title, isLoggedIn };
      });
      logger.info("test.headless_vs_visible.headless_result", { workspaceId, result: headlessResult });
    } catch (err) {
      headlessResult = { error: (err as Error).message };
      logger.error("test.headless_vs_visible.headless_error", { workspaceId, error: String(err) });
    }

    // Test 2: Visible browser (headless: false)
    let visibleResult: any;
    try {
      visibleResult = await withLinkedInPageForUser(workspaceId, async (page) => {
        const url = page.url();
        const title = await page.title();
        const isLoggedIn = !url.includes("/login") && !url.includes("/uas/oauth");
        return { url, title, isLoggedIn };
      });
      logger.info("test.headless_vs_visible.visible_result", { workspaceId, result: visibleResult });
    } catch (err) {
      visibleResult = { error: (err as Error).message };
      logger.error("test.headless_vs_visible.visible_error", { workspaceId, error: String(err) });
    }

    return NextResponse.json({
      workspace: workspaceId,
      headless: headlessResult,
      visible: visibleResult,
    });

  } catch (err) {
    logger.error("test.headless_vs_visible.error", { error: String(err) });
    return NextResponse.json({
      error: "Test failed",
      message: (err as Error).message,
    }, { status: 500 });
  } finally {
    await shutdownBrowser().catch(() => {});
  }
}
