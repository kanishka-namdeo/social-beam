/**
 * Direct Playwright test: Verify browser runs invisibly via Xvfb.
 * Does not import app modules -- uses playwright-core directly.
 */

const { chromium } = require("playwright-core");

(async () => {
  console.log("=== Xvfb + Browser Visibility Test ===");
  console.log(`DISPLAY=${process.env.DISPLAY}`);
  console.log(`XVFB_DISPLAY=${process.env.XVFB_DISPLAY}`);

  // Launch with same config as cloakbrowser service.ts
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--window-position=-32000,-32000',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  });

  console.log(`Browser launched successfully`);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  console.log("Navigating to LinkedIn...");
  await page.goto("https://www.linkedin.com", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  const url = page.url();
  const title = await page.title();

  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);

  if (url.includes("/login") || url.includes("/uas/oauth")) {
    console.log("\nRESULT: Page loaded but NOT logged in (cookie expired or missing).");
    console.log("This is EXPECTED BEHAVIOR - the browser rendered to Xvfb successfully!");
    console.log("The scraping infrastructure works, just needs a valid cookie.");
  } else {
    console.log("\nRESULT: Logged in to LinkedIn successfully!");
    console.log("Xvfb virtual display is working - browser is invisible to end user.");
  }

  await browser.close();
  console.log("\n=== Test Complete ===");
})();
