/**
 * Extract Facebook c_user and xs cookies for the inbox scraper.
 *
 * Usage:
 *   node scripts/extract-facebook-cookie.mjs
 */

import { launch } from "cloakbrowser";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const COOKIE_DIR = join(process.cwd(), ".data");
const C_USER_FILE = join(COOKIE_DIR, "facebook-c-user.txt");
const XS_FILE = join(COOKIE_DIR, "facebook-xs.txt");

async function main() {
  console.log("=== Facebook Cookie Extractor ===\n");

  if (!existsSync(COOKIE_DIR)) {
    mkdirSync(COOKIE_DIR, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("Opening Facebook login page...");
  console.log("Please log in to your Facebook account in the browser window.\n");
  await page.goto("https://www.facebook.com/login/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("Waiting for you to log in...\n");

  let loggedIn = false;
  for (let i = 0; i < 60; i++) {
    try {
      const url = page.url();
      if (url.includes("/feed") || (url.includes("facebook.com") && !url.includes("/login"))) {
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

  console.log("Extracting c_user and xs cookies...");
  const cookies = await page.context().cookies();
  const cUser = cookies.find((c) => c.name === "c_user");
  const xs = cookies.find((c) => c.name === "xs");

  if (!cUser?.value) {
    console.error("\nERROR: Could not find c_user cookie.");
    await browser.close();
    process.exit(1);
  }

  writeFileSync(C_USER_FILE, cUser.value, "utf-8");
  console.log(`c_user cookie saved to: ${C_USER_FILE}`);

  if (xs?.value) {
    writeFileSync(XS_FILE, xs.value, "utf-8");
    console.log(`xs cookie saved to: ${XS_FILE}`);
  }

  console.log("\n=== SUCCESS ===");
  console.log("\nYou can now use the Facebook scraper.\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
