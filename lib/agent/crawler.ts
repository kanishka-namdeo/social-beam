
import { launch } from "cloakbrowser";
import { PlaywrightCrawler, RequestList } from "crawlee";
import { logger } from "@/lib/logger";

const VOICE_RICH_PATHS = ["/", "/about", "/blog", "/mission", "/team", "/our-story"];

const PAGE_TIMEOUT_SEC = 15;
const TOTAL_TIMEOUT_MS = 120000;
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const MAX_PAGES = 20;

interface ZoneContent {
  page: string;
  zone: string;
  weight: number;
  text: string;
}

let activeCrawler: PlaywrightCrawler | undefined;

async function fetchRobotsTxt(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return res.text();
    }
  } catch {
    logger.debug("agent.crawler.robots_not_found", { baseUrl });
  }
  return null;
}

function isPathAllowed(robotsTxt: string | null, path: string, baseUrl: string): boolean {
  if (!robotsTxt) return true;

  try {
    const url = new URL(path, baseUrl);
    const pathname = url.pathname;

    const lines = robotsTxt.split("\n");
    const disallowPaths: string[] = [];
    let inAgentSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        const agent = trimmed.split(":")[1].trim().toLowerCase();
        inAgentSection = agent === "*" || agent.includes("socialbeam");
      } else if (trimmed.toLowerCase().startsWith("disallow:") && inAgentSection) {
        const disallowed = trimmed.split(":")[1].trim();
        if (disallowed) {
          disallowPaths.push(disallowed);
        }
      } else if (trimmed.toLowerCase().startsWith("allow:") && inAgentSection) {
        const allowed = trimmed.split(":")[1].trim();
        if (allowed && pathname.startsWith(allowed)) {
          return true;
        }
      }
    }

    for (const disallowed of disallowPaths) {
      if (pathname.startsWith(disallowed)) {
        return false;
      }
    }
  } catch {
    return true;
  }

  return true;
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

const ZONE_SELECTORS = [
  { zone: "hero", selector: "header, .hero, .hero-section, [class*='hero']", weight: 3 },
  { zone: "heading", selector: "h1, h2, h3", weight: 2 },
  { zone: "body", selector: "article, main, .content, .post-content, .page-content", weight: 1 },
];

const EXCLUDED_SELECTORS = "nav, footer, .nav, .footer, .header, .sidebar, .menu, script, style, noscript, iframe";

async function extractZonesFromPage(page: { $$eval: (selector: string, fn: (els: Element[]) => string) => Promise<string> }, selector: string): Promise<string> {
  return page.$$eval(selector, (els) => {
    const excludedSelector = EXCLUDED_SELECTORS;
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
  });
}

export interface CrawlResult {
  [pagePath: string]: ZoneContent;
}

export async function crawlWebsite(url: string): Promise<CrawlResult> {
  if (!validateUrl(url)) {
    throw new Error(`Invalid URL: ${url}. Must be http or https.`);
  }

  const baseUrl = new URL(url).origin;
  const domain = extractDomain(url);
  logger.info("agent.crawler.start", { url, domain });

  const robotsTxt = await fetchRobotsTxt(baseUrl);

  const seedUrls = [
    url,
    ...VOICE_RICH_PATHS
      .filter((p) => p !== "/")
      .map((p) => `${baseUrl}${p}`),
  ];

  const requestList = await RequestList.open("brand-crawl", seedUrls);

  const result: CrawlResult = {};
  const startTime = Date.now();

  const crawler = new PlaywrightCrawler({
    requestList,
    maxRequestsPerCrawl: MAX_PAGES,
    maxRequestRetries: MAX_RETRIES,
    maxConcurrency: MAX_CONCURRENCY,
    navigationTimeoutSecs: PAGE_TIMEOUT_SEC,
    launchContext: {
      launcher: launch,
      launchOptions: {
        headless: true,
      },
    },
    preNavigationHooks: [
      async ({ request }) => {
        const requestUrl = request.url;
        const relativePath = requestUrl.replace(baseUrl, "") || "/";
        if (!isPathAllowed(robotsTxt, relativePath, baseUrl)) {
          logger.debug("agent.crawler.path_blocked_by_robots", { url, path: relativePath });
          throw new Error(`Path blocked by robots.txt: ${relativePath}`);
        }
      },
    ],
    failedRequestHandler: async ({ request }) => {
      const relativePath = request.url.replace(baseUrl, "") || "/";
      logger.debug("agent.crawler.path_failed_all_retries", { url, path: relativePath });
    },
    requestHandler: async ({ page, request, enqueueLinks }) => {
      if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
        logger.warn("agent.crawler.timeout", { url, elapsedMs: Date.now() - startTime });
        return;
      }

      const pageUrl = request.url;
      const relativePath = pageUrl.replace(baseUrl, "") || "/";

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

      if (pageUrl === url) {
        await enqueueLinks({
          globs: ["**/about*", "**/blog*", "**/mission*", "**/team*", "**/our-story*", "**/values*", "**/products*", "**/services*"],
          strategy: "same-hostname",
        });
      }

      logger.debug("agent.crawler.page_crawled", { url, path: relativePath, zoneCount: Object.keys(result).filter((k) => k.startsWith(relativePath)).length });
    },
  });

  activeCrawler = crawler;

  try {
    await crawler.run();
  } finally {
    activeCrawler = undefined;
  }

  logger.info("agent.crawler.complete", { url, zoneCount: Object.keys(result).length, elapsedMs: Date.now() - startTime });

  return result;
}

export async function shutdownCrawler(): Promise<void> {
  if (activeCrawler) {
    try {
      activeCrawler.stop();
    } catch {
      // Crawler may have already finished or be in an invalid state
    }
    activeCrawler = undefined;
  }
}
