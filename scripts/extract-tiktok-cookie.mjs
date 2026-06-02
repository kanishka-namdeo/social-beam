/**
 * Extract TikTok sessionid cookie for the inbox scraper.
 *
 * Usage:
 *   node scripts/extract-tiktok-cookie.mjs
 */

import { launch } from "cloakbrowser";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const COOKIE_DIR = join(process.cwd(), ".data");
const COOKIE_FILE = join(COOKIE_DIR, "tiktok-sessionid.txt");

async function main() {
  console.log("=== TikTok Cookie Extractor ===\n");

  if (!existsSync(COOKIE_DIR)) {
    mkdirSync(COOKIE_DIR, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("Opening TikTok login page...");
  console.log("Please log in to your TikTok account in the browser window.\n");
  await page.goto("https://www.tiktok.com/login/email", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("Waiting for you to log in...\n");

  let loggedIn = false;
  for (let i = 0; i < 60; i++) {
    try {
      const url = page.url();
      if (url.includes("/foryou") || (url.includes("tiktok.com") && !url.includes("/login"))) {
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
    await browser.close();
    process.exit(1);
  }

  writeFileSync(COOKIE_FILE, sessionCookie.value, "utf-8");
  console.log("\n=== SUCCESS ===");
  console.log(`sessionid cookie saved to: ${COOKIE_FILE}`);
  console.log("\nYou can now use the TikTok scraper.\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
