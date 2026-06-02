/**
 * Extract X/Twitter auth_token cookie for the inbox scraper.
 *
 * Usage:
 *   node scripts/extract-x-cookie.mjs
 */

import { launch } from "cloakbrowser";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const COOKIE_DIR = join(process.cwd(), ".data");
const AUTH_TOKEN_FILE = join(COOKIE_DIR, "x-auth-token.txt");
const CT0_FILE = join(COOKIE_DIR, "x-ct0.txt");

async function main() {
  console.log("=== X/Twitter Cookie Extractor ===\n");

  if (!existsSync(COOKIE_DIR)) {
    mkdirSync(COOKIE_DIR, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("Opening X login page...");
  console.log("Please log in to your X account in the browser window.\n");
  await page.goto("https://x.com/login", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("Waiting for you to log in...\n");

  let loggedIn = false;
  for (let i = 0; i < 60; i++) {
    try {
      const url = page.url();
      if (url.includes("/home") || (url.includes("x.com") && !url.includes("/login"))) {
        loggedIn = true;
        console.log(`\nDetected successful login! You are on: ${url}`);
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!loggedIn) {
    console.log("\nLogin not detected after 5 minutes. Trying anyway to extract cookies...");
  }

  console.log("Extracting auth_token and ct0 cookies...");
  const cookies = await page.context().cookies();
  const authToken = cookies.find((c) => c.name === "auth_token");
  const ct0 = cookies.find((c) => c.name === "ct0");

  if (!authToken?.value) {
    console.error("\nERROR: Could not find auth_token cookie.");
    await browser.close();
    process.exit(1);
  }

  writeFileSync(AUTH_TOKEN_FILE, authToken.value, "utf-8");
  console.log(`auth_token cookie saved to: ${AUTH_TOKEN_FILE}`);

  if (ct0?.value) {
    writeFileSync(CT0_FILE, ct0.value, "utf-8");
    console.log(`ct0 cookie saved to: ${CT0_FILE}`);
  }

  console.log("\n=== SUCCESS ===");
  console.log("\nYou can now use the X scraper.");
  console.log("Or set TWITTER_AUTH_TOKEN_COOKIE and TWITTER_CT0_COOKIE in your .env file.\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
