/**
 * Extract LinkedIn li_at session cookie for the inbox scraper.
 *
 * Usage:
 *   npx tsx scripts/extract-linkedin-cookie.mjs
 *
 * This script:
 * 1. Opens a browser window to LinkedIn login page
 * 2. Waits for the user to log in manually
 * 3. Extracts the li_at cookie after login
 * 4. Saves it to .data/linkedin-li-at-cookie.txt
 */

import { launch } from "cloakbrowser";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const COOKIE_DIR = join(process.cwd(), ".data");
const COOKIE_FILE = join(COOKIE_DIR, "linkedin-li-at-cookie.txt");

async function main() {
  console.log("=== LinkedIn Cookie Extractor ===\n");

  // Ensure .data directory exists
  if (!existsSync(COOKIE_DIR)) {
    mkdirSync(COOKIE_DIR, { recursive: true });
  }

  // Launch browser (visible so user can interact)
  console.log("Launching browser...");
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // Navigate to LinkedIn login
  console.log("Opening LinkedIn login page...");
  console.log("Please log in to your LinkedIn account in the browser window.\n");
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait for user to log in and reach feed page
  console.log("Waiting for you to log in...");
  console.log("The script will auto-detect when you've successfully logged in.\n");

  // Poll until the user reaches the feed page (indicating successful login)
  let loggedIn = false;
  for (let i = 0; i < 60; i++) { // Wait up to 5 minutes (60 * 5s)
    try {
      const url = page.url();
      if (url.includes("/feed") || url.includes("/mynetwork") || url.includes("/jobs")) {
        loggedIn = true;
        console.log(`\nDetected successful login! You are on: ${url}`);
        break;
      }
    } catch {
      // Page might have been closed or navigated
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!loggedIn) {
    console.log("\nLogin not detected after 5 minutes. Trying anyway to extract cookie...");
  }

  // Extract the li_at cookie
  console.log("Extracting li_at cookie...");
  const cookies = await page.context().cookies();
  const liAtCookie = cookies.find((c) => c.name === "li_at");

  if (!liAtCookie?.value) {
    console.error("\nERROR: Could not find li_at cookie.");
    console.error("Make sure you are logged in to LinkedIn at https://www.linkedin.com");
    await browser.close();
    process.exit(1);
  }

  // Save the cookie
  writeFileSync(COOKIE_FILE, liAtCookie.value, "utf-8");
  console.log("\n=== SUCCESS ===");
  console.log(`li_at cookie saved to: ${COOKIE_FILE}`);
  console.log(`Cookie length: ${liAtCookie.value.length} characters`);
  console.log("\nYou can now use the LinkedIn inbox scraper.");
  console.log("Run: POST /api/inbox/fetch to sync engagement data.\n");

  // Show instructions for future cookie refreshes
  console.log("=== Note ===");
  console.log("LinkedIn session cookies typically last ~1 year.");
  console.log("If the scraper stops working, re-run this script to get a fresh cookie.");
  console.log("Or set the LINKEDIN_LI_AT_COOKIE environment variable in your .env file.\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
