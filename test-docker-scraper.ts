/**
 * Test script: Run LinkedIn scraping from inside Docker with Xvfb.
 * Tests that the non-headless browser renders to the virtual framebuffer
 * and the scraper works end-to-end.
 */

import { prisma } from "@/lib/prisma";
import { withLinkedInPageForUser, shutdownBrowser } from "@/lib/linkedin/browser";
import { logger } from "@/lib/logger";

async function main() {
  logger.info("test.docker_scraper.start");

  // Find a workspace with a connected LinkedIn account
  const account = await prisma.connectedAccount.findFirst({
    where: {
      platform: "linkedin",
      status: "connected",
    },
    include: {
      Workspace: true,
    },
  });

  if (!account) {
    logger.error("test.docker_scraper.no_linked_in_account");
    console.log("ERROR: No connected LinkedIn account found in database");
    process.exit(1);
  }

  const workspaceId = account.workspaceId;
  console.log(`Found LinkedIn account for workspace: ${workspaceId}`);
  console.log(`Account ID: ${account.id}`);

  // Test withLinkedInPageForUser - this uses headless:false + storage state
  console.log("\n=== Testing withLinkedInPageForUser (headless:false) ===");
  
  try {
    const result = await withLinkedInPageForUser(workspaceId, async (page: any) => {
      const url = page.url();
      console.log(`Page navigated to: ${url}`);

      // Check if we're logged in (should NOT see /login)
      const isLoggedIn = !url.includes("/login") && !url.includes("/uas/oauth");
      console.log(`Login status: ${isLoggedIn ? "LOGGED IN" : "NOT LOGGED IN"}`);

      if (!isLoggedIn) {
        throw new Error(`Not logged in. Current URL: ${url}`);
      }

      // Check DISPLAY environment
      const display = await page.evaluate(() => process.env.DISPLAY || "not set");
      console.log(`DISPLAY env from browser context: ${display}`);

      // Get page title to verify LinkedIn loaded
      const title = await page.title();
      console.log(`Page title: ${title}`);

      // Check viewport
      const viewport = await page.viewportSize();
      console.log(`Viewport: ${JSON.stringify(viewport)}`);

      return { url, isLoggedIn, title, viewport };
    });

    console.log("\n=== Result ===");
    console.log(JSON.stringify(result, null, 2));
    console.log("\nSUCCESS: LinkedIn scraper works inside Docker + Xvfb!");
  } catch (err) {
    console.log(`\nERROR: ${err}`);
    process.exit(1);
  } finally {
    await shutdownBrowser();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
