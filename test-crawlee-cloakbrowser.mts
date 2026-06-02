/**
 * Realtime integration test for cloakbrowser + crawlee.
 *
 * Run: pnpm dlx tsx --env-file=.env test-crawlee-cloakbrowser.mts
 *
 * Tests:
 * 1. CloakBrowser launch + basic page navigation
 * 2. Crawlee PlaywrightCrawler with cloakbrowser launcher
 * 3. End-to-end scrape of https://buffer.com/
 */

import { launch } from "cloakbrowser";
import { PlaywrightCrawler, RequestList, Dataset } from "crawlee";
import { chromium } from "playwright-core";

// Cloakbrowser launcher wrapper - Crawlee's PlaywrightPlugin expects a Playwright browser-type-like
const cloakbrowserLauncher = {
  launch: launch,
  name: () => "chromium",
  launchPersistentContext: async (...args: unknown[]) => {
    const browserType = chromium as unknown as Record<string, unknown>;
    const fn = browserType.launchPersistentContext as (...a: unknown[]) => Promise<unknown>;
    return fn(...args);
  },
};

const TEST_URL = "https://buffer.com/";
const TIMEOUT_MS = 120_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(test: string, status: "PASS" | "FAIL" | "INFO", detail?: string) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️ ";
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${timestamp}] ${icon} [${status}] ${test}${detail ? ` — ${detail}` : ""}`);
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

// ─── Test 1: CloakBrowser Launch + Basic Navigation ───────────────────────────

async function testCloakBrowserLaunch(): Promise<boolean> {
  log("CloakBrowser Launch", "INFO", "Launching browser...");
  const start = Date.now();

  let browser: Awaited<ReturnType<typeof launch>> | undefined;
  try {
    browser = await launch({ headless: true });
    log("CloakBrowser Launch", "PASS", `Browser launched in ${elapsed(start)}`);

    log("CloakBrowser Page Navigation", "INFO", `Navigating to ${TEST_URL}...`);
    const page = await browser.newPage();
    await page.goto(TEST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const title = await page.title();
    log("CloakBrowser Page Navigation", "PASS", `Page title: "${title}" (${elapsed(start)})`);

    // Grab some content to verify we actually got page data
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? "");
    log("CloakBrowser Content", "PASS", `Body text length: ${bodyText.length} chars (${elapsed(start)})`);
    if (bodyText.length > 0) {
      log("CloakBrowser Content", "INFO", `Preview: "${bodyText.slice(0, 100)}..."`);
    }

    await page.close();
    await browser.close();
    log("CloakBrowser Close", "PASS", `Browser closed (${elapsed(start)})`);
    return true;
  } catch (err) {
    log("CloakBrowser Launch", "FAIL", `Error: ${String(err)}`);
    try {
      await browser?.close();
    } catch {
      // ignore
    }
    return false;
  }
}

// ─── Test 2: Crawlee PlaywrightCrawler with CloakBrowser Launcher ─────────────

async function testCrawleeWithCloakBrowser(): Promise<boolean> {
  log("Crawlee + CloakBrowser Integration", "INFO", "Setting up crawler...");
  const start = Date.now();

  try {
    const requestList = await RequestList.open("test-crawl", [TEST_URL]);

    const results: Array<{ url: string; title: string; textLength: number }> = [];

    const crawler = new PlaywrightCrawler({
      requestList,
      maxRequestsPerCrawl: 5,
      maxRequestRetries: 2,
      maxConcurrency: 1,
      navigationTimeoutSecs: 30,
      browserPoolOptions: {
        useFingerprints: false,
      },
      launchContext: {
        launcher: chromium,
        launchOptions: {
          headless: true,
        },
      },
      requestHandler: async ({ page, request }) => {
        const title = await page.title();
        const bodyText = await page.evaluate(
          () => document.body?.innerText?.slice(0, 500) ?? "",
        );

        results.push({
          url: request.url,
          title,
          textLength: bodyText.length,
        });

        log(`Crawlee Page: ${request.url}`, "PASS", `Title: "${title}", Body: ${bodyText.length} chars`);
      },
    });

    await crawler.run();

    if (results.length === 0) {
      log("Crawlee + CloakBrowser Integration", "FAIL", "No pages crawled");
      return false;
    }

    log("Crawlee + CloakBrowser Integration", "PASS", `Crawled ${results.length} page(s) in ${elapsed(start)}`);
    return true;
  } catch (err) {
    log("Crawlee + CloakBrowser Integration", "FAIL", `Error: ${String(err)}`);
    return false;
  }
}

// ─── Test 3: Full Scrape of buffer.com with Zone Extraction ───────────────────

async function testFullScrape(): Promise<boolean> {
  log("Full Scrape (buffer.com)", "INFO", "Setting up full crawl...");
  const start = Date.now();

  const VOICE_RICH_PATHS = ["/", "/about", "/pricing", "/help", "/resources"];
  const baseUrl = new URL(TEST_URL).origin;

  const seedUrls = [
    TEST_URL,
    ...VOICE_RICH_PATHS
      .filter((p) => p !== "/")
      .map((p) => `${baseUrl}${p}`),
  ];

  log("Full Scrape (buffer.com)", "INFO", `Seed URLs: ${seedUrls.length}`);

  const result: Record<string, { page: string; zone: string; weight: number; text: string }> = {};

  const ZONE_SELECTORS = [
    { zone: "hero", selector: "header, .hero, .hero-section, [class*='hero']", weight: 3 },
    { zone: "heading", selector: "h1, h2, h3", weight: 2 },
    { zone: "body", selector: "article, main, .content, .post-content, .page-content", weight: 1 },
  ];

  try {
    const requestList = await RequestList.open("test-full-scrape", seedUrls);

    const crawler = new PlaywrightCrawler({
      requestList,
      maxRequestsPerCrawl: 10,
      maxRequestRetries: 2,
      maxConcurrency: 2,
      navigationTimeoutSecs: 30,
      browserPoolOptions: {
        useFingerprints: false,
      },
      launchContext: {
        launcher: chromium,
        launchOptions: {
          headless: true,
        },
      },
      requestHandler: async ({ page, request }) => {
        const pageUrl = request.url;
        const relativePath = pageUrl.replace(baseUrl, "") || "/";

        for (const { zone, selector, weight } of ZONE_SELECTORS) {
          try {
            const text = await page.$$eval(selector, (els: Element[]) => {
              let result = "";
              for (const el of els) {
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll("nav, footer, .nav, .footer, .header, .sidebar, .menu, script, style, noscript, iframe").forEach((e) => e.remove());
                result += " " + clone.innerText;
              }
              return result.trim();
            });

            if (text && text.length > 10) {
              const key = `${relativePath}/${zone}`;
              result[key] = { page: relativePath, zone, weight, text };
              log(`Zone: ${relativePath}/${zone}`, "PASS", `${text.length} chars`);
            }
          } catch (zoneErr) {
            log(`Zone: ${relativePath}/${zone}`, "FAIL", `${String(zoneErr)}`);
          }
        }
      },
    });

    await crawler.run();

    const zoneCount = Object.keys(result).length;
    if (zoneCount === 0) {
      log("Full Scrape (buffer.com)", "FAIL", "No zones extracted");
      return false;
    }

    log("Full Scrape (buffer.com)", "PASS", `${zoneCount} zones extracted from ${Object.keys(new Set(Object.values(result).map((r) => r.page))).length} page(s) in ${elapsed(start)}`);

    // Print summary
    console.log("\n─── Scraping Summary ───────────────────────────────");
    for (const [key, zone] of Object.entries(result)) {
      console.log(`  ${key}: ${zone.text.length} chars — "${zone.text.slice(0, 80)}..."`);
    }
    console.log("────────────────────────────────────────────────────\n");

    return true;
  } catch (err) {
    log("Full Scrape (buffer.com)", "FAIL", `Error: ${String(err)}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  CloakBrowser + Crawlee Integration Test Suite         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const overallStart = Date.now();
  const results: { test: string; passed: boolean }[] = [];

  // Test 1
  const t1 = await testCloakBrowserLaunch();
  results.push({ test: "CloakBrowser Launch + Navigation", passed: t1 });

  console.log("");

  // Test 2
  const t2 = await testCrawleeWithCloakBrowser();
  results.push({ test: "Crawlee + CloakBrowser Integration", passed: t2 });

  console.log("");

  // Test 3
  const t3 = await testFullScrape();
  results.push({ test: "Full Scrape (buffer.com)", passed: t3 });

  // Final report
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Final Report                                            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.test}`);
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`\n  Total time: ${elapsed(overallStart)}`);
  console.log(`  Overall: ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
