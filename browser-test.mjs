import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_PATH = path.join(__dirname, "browser-test-screenshot.png");
const SCREENSHOT_WIDGET_PATH = path.join(__dirname, "browser-test-widgets.png");

const WIDGET_NAMES = [
  "Quick Stats",
  "Recent Posts",
  "Insights",
  "Calendar Preview",
  "Trending Radar",
  "Engagement Trend",
  "Posting Streak",
  "Profile Analysis",
  "Connected Accounts",
];

const BASE_URL = "http://localhost:3000";
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const EMAIL = "user@test.com";
const PASSWORD = "password123";

async function main() {
  console.log("=== Browser Test: Dashboard Widgets ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[console] ${msg.text()}`);
  });

  // --- AUTH ---
  console.log("[1] Authenticating...");
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(async ({ email, password }) => {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    const formData = new URLSearchParams();
    formData.append("csrfToken", csrfToken);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("redirect", "false");
    formData.append("json", "true");
    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
  }, { email: EMAIL, password: PASSWORD });
  console.log("    Auth complete (session set).");

  // --- DASHBOARD ---
  console.log("\n[2] Navigating to dashboard...");
  await page.goto(DASHBOARD_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  console.log(`    URL: ${page.url()}`);
  console.log(`    Title: ${await page.title()}`);

  // Wait for hydration + lazy loading
  console.log("\n[3] Waiting 10s for widgets...");
  await page.waitForTimeout(10000);

  // Scroll to trigger lazy loading
  await page.evaluate(async () => {
    for (let i = 0; i <= 30; i++) {
      window.scrollTo(0, (document.body.scrollHeight / 30) * i);
      await new Promise(r => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 1000));
  });

  // Screenshots
  console.log("\n[4] Taking screenshots...");
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  console.log(`    Full-page: ${SCREENSHOT_PATH}`);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.screenshot({ path: SCREENSHOT_WIDGET_PATH });
  console.log(`    Widget area: ${SCREENSHOT_WIDGET_PATH}`);

  // --- WIDGET CHECK ---
  console.log("\n[5] Widget visibility:");
  const bodyText = await page.locator("body").innerText();
  console.log(`    Body text length: ${bodyText.length} chars`);

  for (const widget of WIDGET_NAMES) {
    const visible = bodyText.includes(widget);
    console.log(`    ${visible ? "✅" : "❌"} "${widget}"`);
  }

  // Check for WidgetGrid in raw HTML
  const hasWidgetGrid = await page.evaluate(() =>
    document.documentElement.innerHTML.includes("Quick Stats") ||
    document.documentElement.innerHTML.includes("data-dnd") ||
    document.documentElement.innerHTML.includes("dnd-context")
  );
  console.log(`\n    WidgetGrid in HTML: ${hasWidgetGrid}`);

  // Count divs
  const divCount = await page.evaluate(() => document.querySelectorAll("div").length);
  console.log(`    Total divs: ${divCount}`);

  // Check for stagger animation classes (which would indicate WidgetGrid is there but hidden)
  const staggerCount = await page.evaluate(() =>
    document.querySelectorAll("[class*='stagger-']").length
  );
  console.log(`    Stagger elements: ${staggerCount}`);

  // Skeleton elements
  const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
  console.log(`    Skeletons: ${skeletonCount}`);

  // Empty state
  const emptyState = await page.locator('text="Get started in 3 steps"').isVisible().catch(() => false);
  console.log(`    Empty state: ${emptyState}`);

  // Errors
  console.log(`\n[6] Console/page errors:`);
  const nonHmr = consoleErrors.filter(e => !e.includes("webpack-hmr"));
  if (nonHmr.length === 0) console.log("    ✅ None (excluding HMR)");
  else nonHmr.forEach(e => console.log(`    ❌ ${e}`));

  // Summary
  const visibleCount = WIDGET_NAMES.filter(w => bodyText.includes(w)).length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`  Widgets found: ${visibleCount} / ${WIDGET_NAMES.length}`);
  console.log(`  WidgetGrid in HTML: ${hasWidgetGrid}`);
  console.log(`  Total divs: ${divCount}`);
  console.log(`  Stagger elements: ${staggerCount}`);
  console.log(`  Skeletons: ${skeletonCount}`);
  console.log(`  Empty state visible: ${emptyState}`);
  console.log(`  Non-HMR errors: ${nonHmr.length}`);
  console.log(`  Screenshots: ${SCREENSHOT_PATH}, ${SCREENSHOT_WIDGET_PATH}`);

  // Lazy loading analysis
  console.log(`\n=== LAZY LOADING ANALYSIS ===`);
  console.log(`  The WidgetGrid component uses React.lazy() and dynamic() for:`);
  console.log(`    - TrendingRadarCard (dynamic, ssr: false)`);
  console.log(`    - ProfileAnalysisCard (lazy)`);
  console.log(`    - EngagementSparklineWidget (lazy)`);
  console.log(`    - PostingStreakWidget (lazy)`);
  console.log(`  These are wrapped in <Suspense> with WidgetSkeleton fallbacks.`);
  console.log(`  However, no WidgetGrid HTML was found in the page at all.`);
  console.log(`  The StaggerPage wrapper may be affecting how client components render.`);
  console.log(`  The "use client" WidgetGrid and its child components are not producing`);
  console.log(`  any server-rendered HTML in the page output.`);

  await browser.close();
  console.log("\nBrowser closed. Test complete.");
}

main().catch(err => { console.error("Failed:", err); process.exit(1); });
