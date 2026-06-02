/**
 * Extract Instagram sessionid cookie for the inbox scraper.
 *
 * Usage:
 *   node scripts/extract-instagram-cookie.mjs
 *
 * This script:
 * 1. Opens a browser window to Instagram login page
 * 2. Waits for the user to log in manually
 * 3. Extracts the sessionid cookie after login
 * 4. Saves it to .data/instagram-sessionid.txt
 */

import { launch } from "cloakbrowser";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const COOKIE_DIR = join(process.cwd(), ".data");
const COOKIE_FILE = join(COOKIE_DIR, "instagram-sessionid.txt");

async function main() {
  console.log("=== Instagram Cookie Extractor ===\n");

  if (!existsSync(COOKIE_DIR)) {
    mkdirSync(COOKIE_DIR, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("Opening Instagram login page...");
  console.log("Please log in to your Instagram account in the browser window.\n");
  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("Waiting for you to log in...");
  console.log("The script will auto-detect when you've successfully logged in.\n");

  let loggedIn = false;
  for (let i = 0; i < 60; i++) {
    try {
      const url = page.url();
      if (url.includes("/instagram.com/") && !url.includes("/login") && !url.includes("/accounts")) {
        loggedIn = true;
        console.log(`\nDetected successful login! You are on: ${url}`);
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!loggedIn) {
    console.log("\nLogin not detected after 5 minutes. Trying anyway to extract cookie...");
  }

  console.log("Extracting sessionid cookie...");
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "sessionid");

  if (!sessionCookie?.value) {
    console.error("\nERROR: Could not find sessionid cookie.");
    console.error("Make sure you are logged in to Instagram at https://www.instagram.com");
    await browser.close();
    process.exit(1);
  }

  writeFileSync(COOKIE_FILE, sessionCookie.value, "utf-8");
  console.log("\n=== SUCCESS ===");
  console.log(`sessionid cookie saved to: ${COOKIE_FILE}`);
  console.log(`Cookie length: ${sessionCookie.value.length} characters`);
  console.log("\nYou can now use the Instagram scraper.");
  console.log("Or set the INSTAGRAM_SESSIONID_COOKIE environment variable in your .env file.\n");

  console.log("=== Note ===");
  console.log("Instagram session cookies typically last ~3-6 months.");
  console.log("If the scraper stops working, re-run this script to get a fresh cookie.\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
