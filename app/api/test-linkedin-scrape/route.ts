/**
 * Test API route: Trigger LinkedIn scraping from inside Docker.
 * Access via: curl http://localhost:3001/api/test-linkedin-scrape
 */
import { NextResponse } from "next/server";
import { withLinkedInPageForUser, shutdownBrowser } from "@/lib/linkedin/browser";
import { scrapeLinkedInComments } from "@/lib/inbox/scrapers/linkedin-scraper";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Find a workspace with a connected LinkedIn account
    const account = await prisma.connectedAccount.findFirst({
      where: {
        platform: "linkedin",
        status: "connected",
      },
    });

    if (!account) {
      return NextResponse.json({
        error: "No connected LinkedIn account found",
        note: "Please connect a LinkedIn account first",
      }, { status: 400 });
    }

    const workspaceId = account.workspaceId;
    logger.info("test.linkedin_scrape.start", { workspaceId, account: account.platformUsername || account.id });

    try {
      // Step 1: Test browser session with visible browser (headless: false)
      const sessionResult = await withLinkedInPageForUser(workspaceId, async (page) => {
        const url = page.url();
        const title = await page.title();
        const viewport = page.viewportSize();

        // Check if logged in
        const isLoggedIn = !url.includes("/login") && !url.includes("/uas/oauth");

        return {
          url,
          title,
          isLoggedIn,
          viewport,
          timestamp: new Date().toISOString(),
        };
      });

      if (!sessionResult) {
        return NextResponse.json({
          error: "No cookie available for this account",
        }, { status: 400 });
      }

      if (!sessionResult.isLoggedIn) {
        return NextResponse.json({
          error: "LinkedIn session expired (cookie expired)",
          session: sessionResult,
          note: "Please reconnect LinkedIn account to refresh cookie",
        }, { status: 401 });
      }

      // Step 2: Run the actual scraper
      const comments = await scrapeLinkedInComments(workspaceId);

      return NextResponse.json({
        status: "success",
        session: sessionResult,
        scraping: {
          postsProcessed: comments.length > 0 ? "multiple posts" : "no comments found",
          totalCommentsScraped: comments.length,
          sampleComments: comments.slice(0, 3).map((c) => ({
            author: c.authorName,
            content: c.content?.slice(0, 150),
          })),
        },
        note: "Browser rendered invisibly via Xvfb - no visible window on host",
      });
    } finally {
      await shutdownBrowser();
    }

  } catch (err) {
    logger.error("test.linkedin_scrape.error", { error: String(err) });
    return NextResponse.json({
      error: "Scraping failed",
      message: (err as Error).message,
      stack: process.env.NODE_ENV === "development" ? (err as Error).stack : undefined,
    }, { status: 500 });
  }
}
