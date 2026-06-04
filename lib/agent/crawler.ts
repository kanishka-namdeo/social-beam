
import { launch, launchPersistentContext } from "cloakbrowser";
import type { Browser, BrowserContext } from "playwright-core";
import { PlaywrightCrawler, RequestList } from "crawlee";
import { logger } from "@/lib/logger";

/**
 * CloakBrowser launcher adapter for Crawlee's PlaywrightPlugin.
 *
 * Crawlee expects a Playwright BrowserType-like object with:
 * - `.name()` — string identifier
 * - `.launch(options)` — returns a Browser
 * - `.launchPersistentContext(userDataDir, options)` — returns a BrowserContext
 *
 * The raw `launch` function from cloakbrowser doesn't satisfy this interface,
 * so we wrap it to match what Crawlee's browser pool expects.
 */
interface LauncherLike {
  name: () => string;
  launch: (options?: Record<string, unknown>) => Promise<Browser>;
  launchPersistentContext: (userDataDir: string, options?: Record<string, unknown>) => Promise<BrowserContext>;
  connectOverCDP: () => never;
  connect: () => never;
  executablePath: () => string;
  launchServer: () => never;
}

const cloakbrowserLauncher: LauncherLike = {
  name: () => "cloakbrowser" as const,
  launch: async (options?: Record<string, unknown>) => launch(options) as Promise<Browser>,
  launchPersistentContext: async (userDataDir: string, options?: Record<string, unknown>) =>
    launchPersistentContext({ userDataDir, ...options } as Parameters<typeof launchPersistentContext>[0]) as Promise<BrowserContext>,
  // Stubs for BrowserType methods Crawlee may type-check but doesn't call
  connectOverCDP: () => { throw new Error("connectOverCDP not supported"); },
  connect: () => { throw new Error("connect not supported"); },
  executablePath: () => "",
  launchServer: () => { throw new Error("launchServer not supported"); },
};

const FALLBACK_VOICE_PATHS = ["/", "/about", "/blog", "/mission", "/team", "/our-story"];

const PAGE_TIMEOUT_SEC = 30;
const INITIAL_WAIT_MS = 3000;
const TOTAL_TIMEOUT_MS = 120000;
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const MAX_PAGES = 20;
const MAX_CRAWL_DEPTH = 3;

const ENQUEUE_GLOBS = [
  "**/about*", "**/blog*", "**/mission*", "**/team*",
  "**/our-story*", "**/values*", "**/products*", "**/services*",
  "**/resources*", "**/features*", "**/why-us*", "**/how-it-works*",
];

const AUTH_PATH_PATTERNS = ["/login", "/signup", "/auth", "/oauth", "/register", "/forgot-password", "/signin", "/sign-up", "/sign-in"];
const TRANSACTIONAL_PATH_PATTERNS = ["/checkout", "/cart", "/payment", "/order", "/billing", "/subscribe", "/pricing", "/plans"];
const ADMIN_PATH_PATTERNS = ["/admin", "/dashboard", "/api", "/wp-admin", "/wp-login", "/wp-json", "/.well-known"];
const NON_PAGE_EXTENSIONS = [".pdf", ".zip", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".xml", ".doc", ".docx"];

interface ZoneContent {
  page: string;
  zone: string;
  weight: number;
  text: string;
}

let activeCrawler: PlaywrightCrawler | undefined;
let crawlerLastUsed: number = Date.now();
const CRAWLER_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Register cleanup handlers for graceful crawler shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', shutdownCrawler);
  process.on('SIGTERM', async () => {
    await shutdownCrawler();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await shutdownCrawler();
    process.exit(0);
  });
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const allUrls = new Set<string>();

  for (const sitemapPath of ["/sitemap.xml", "/sitemap_index.xml"]) {
    try {
      const res = await fetch(`${baseUrl}${sitemapPath}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
      for (const match of locMatches) {
        const url = match.replace(/<\/?loc>/g, "").trim();
        try {
          const parsed = new URL(url);
          if (parsed.origin === baseUrl && !shouldSkipUrl(url)) {
            allUrls.add(url);
          }
        } catch {
          // invalid URL in sitemap, skip
        }
      }
    } catch {
      logger.debug("agent.crawler.sitemap_fetch_failed", { baseUrl, path: sitemapPath });
    }
  }

  const urls = Array.from(allUrls).slice(0, 50);
  if (urls.length > 0) {
    logger.info("agent.crawler.sitemap_discovered", { baseUrl, urlCount: urls.length });
  }
  return urls;
}

function shouldSkipUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname.toLowerCase();

    if (AUTH_PATH_PATTERNS.some((p) => pathname.startsWith(p))) return true;
    if (TRANSACTIONAL_PATH_PATTERNS.some((p) => pathname.startsWith(p))) return true;
    if (ADMIN_PATH_PATTERNS.some((p) => pathname.startsWith(p))) return true;
    if (NON_PAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true;

    return false;
  } catch {
    return true;
  }
}

const ZONE_SELECTORS = [
  { zone: "hero", selector: "header, .hero, .hero-section, [class*='hero']", weight: 3 },
  { zone: "heading", selector: "h1, h2, h3", weight: 2 },
  { zone: "body", selector: "article, main, .content, .post-content, .page-content", weight: 1 },
  { zone: "aside", selector: "aside, blockquote, .pull-quote, .testimonial, .callout", weight: 2 },
];

const EXCLUDED_SELECTORS = "nav, footer, .nav, .footer, .header, .sidebar, .menu, script, style, noscript, iframe";

async function extractZonesFromPage(page: { $$eval: (selector: string, fn: (els: Element[], excludedSelectors: string) => string, excludedSelectors: string) => Promise<string> }, selector: string): Promise<string> {
  return page.$$eval(selector, (els, excludedSelector) => {
    let result = "";

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const clone = el.cloneNode(true) as HTMLElement;
      const excluded = clone.querySelectorAll(excludedSelector);
      for (let j = 0; j < excluded.length; j++) {
        excluded[j].remove();
      }
      result += " " + clone.innerText;
    }

    return result.trim();
  }, EXCLUDED_SELECTORS);
}

export interface CrawlOptions {
  signal?: AbortSignal;
  onProgress?: (page: string, depth: number, zoneCount: number) => void;
}

export interface CrawlResult {
  [pagePath: string]: ZoneContent;
}

export async function crawlWebsite(url: string, options?: CrawlOptions): Promise<CrawlResult> {
  if (!validateUrl(url)) {
    throw new Error(`Invalid URL: ${url}. Must be http or https.`);
  }

  const baseUrl = new URL(url).origin;
  const domain = extractDomain(url);
  logger.info("agent.crawler.start", { url, domain });

  const sitemapUrls = await fetchSitemapUrls(baseUrl);

  const fallbackUrls = FALLBACK_VOICE_PATHS
    .filter((p) => p !== "/")
    .map((p) => `${baseUrl}${p}`);

  const allSeedUrls = Array.from(new Set([url, ...fallbackUrls, ...sitemapUrls]));

  const seedRequests = allSeedUrls.map((u) => ({
    url: u,
    userData: { depth: 0 },
  }));

  const requestList = await RequestList.open(`brand-crawl-${crypto.randomUUID()}`, seedRequests);

  const result: CrawlResult = {};
  const startTime = Date.now();
  const crawledUrls = new Set<string>();
  const skippedReasons: Record<string, number> = {};

  const crawler = new PlaywrightCrawler({
    requestList,
    maxRequestsPerCrawl: MAX_PAGES,
    maxRequestRetries: MAX_RETRIES,
    maxConcurrency: MAX_CONCURRENCY,
    navigationTimeoutSecs: PAGE_TIMEOUT_SEC,
    browserPoolOptions: {
      useFingerprints: false,
    },
    launchContext: {
      launcher: cloakbrowserLauncher as unknown as import("playwright-core").BrowserType,
      launchOptions: {
        headless: true,
      },
    },
    preNavigationHooks: [
      async ({ request }) => {
        if (options?.signal?.aborted) {
          throw new Error("Crawl aborted by user");
        }

        const requestUrl = request.url;
        const depth = (request.userData?.depth as number) ?? 0;
        const relativePath = requestUrl.replace(baseUrl, "") || "/";

        if (depth >= MAX_CRAWL_DEPTH) {
          skippedReasons.depth = (skippedReasons.depth ?? 0) + 1;
          logger.debug("agent.crawler.path_depth_exceeded", { url, path: relativePath, depth });
          throw new Error(`Depth limit exceeded: ${relativePath} (depth ${depth} >= ${MAX_CRAWL_DEPTH})`);
        }

        if (shouldSkipUrl(requestUrl)) {
          skippedReasons.skipList = (skippedReasons.skipList ?? 0) + 1;
          logger.debug("agent.crawler.path_skipped_by_filter", { url, path: relativePath });
          throw new Error(`Path filtered out: ${relativePath}`);
        }
      },
    ],
    failedRequestHandler: async ({ request }) => {
      const relativePath = request.url.replace(baseUrl, "") || "/";
      logger.debug("agent.crawler.path_failed_all_retries", { url, path: relativePath });
    },
    requestHandler: async ({ page, request, enqueueLinks }) => {
      if (options?.signal?.aborted) {
        logger.info("agent.crawler.aborted", { url, elapsedMs: Date.now() - startTime });
        return;
      }

      if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
        logger.warn("agent.crawler.timeout", { url, elapsedMs: Date.now() - startTime });
        return;
      }

      const pageUrl = request.url;
      const depth = (request.userData?.depth as number) ?? 0;
      const relativePath = pageUrl.replace(baseUrl, "") || "/";

      crawledUrls.add(pageUrl);

      // SPA settling: wait for dynamic content to render after navigation
      try {
        await page.waitForSelector("body", { state: "visible", timeout: 5000 });
        await page.waitForTimeout(INITIAL_WAIT_MS);
      } catch {
        logger.debug("agent.crawler.spa_wait_skipped", { url: pageUrl });
      }

      for (const { zone, selector, weight } of ZONE_SELECTORS) {
        try {
          const text = await extractZonesFromPage(page, selector);

          if (text && text.length > 10) {
            const key = `${relativePath}/${zone}`;
            result[key] = { page: relativePath, zone, weight, text };
          }
        } catch (err) {
          logger.warn("agent.crawler.zone_extract_failed", { url: pageUrl, zone, error: String(err) });
        }
      }

      const pageZoneCount = Object.keys(result).filter((k) => k.startsWith(relativePath)).length;
      options?.onProgress?.(relativePath, depth, pageZoneCount);

      if (depth + 1 < MAX_CRAWL_DEPTH) {
        await enqueueLinks({
          globs: ENQUEUE_GLOBS,
          strategy: "same-hostname",
          userData: { depth: depth + 1 },
        });
      }

      logger.debug("agent.crawler.page_crawled", {
        url,
        path: relativePath,
        depth,
        zoneCount: pageZoneCount,
      });
    },
  });

  activeCrawler = crawler;
  crawlerLastUsed = Date.now();

  try {
    await crawler.run();
  } finally {
    activeCrawler = undefined;
  }

  logger.info("agent.crawler.complete", {
    url,
    zoneCount: Object.keys(result).length,
    pagesCrawled: crawledUrls.size,
    skippedByDepth: skippedReasons.depth ?? 0,
    skippedByFilter: skippedReasons.skipList ?? 0,
    elapsedMs: Date.now() - startTime,
  });

  return result;
}

export async function shutdownCrawler(): Promise<void> {
  if (activeCrawler) {
    try {
      activeCrawler.stop();
      // Wait briefly for crawler to clean up its browser pool
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      // Crawler may have already finished or be in an invalid state
    }
    activeCrawler = undefined;
  }
}
