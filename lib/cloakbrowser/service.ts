import { launch } from "cloakbrowser";
import { logger } from "@/lib/logger";
import type { PageOptions } from "./types";
import { CookieExpiredError, OperationTimeoutError } from "./errors";

type PlaywrightBrowser = Awaited<ReturnType<typeof launch>>;
type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<PlaywrightBrowser["newContext"]>>["newPage"]>>;

const OPERATION_TIMEOUT_MS = 30_000;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

let browser: PlaywrightBrowser | undefined;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function ensureBrowser(): Promise<PlaywrightBrowser> {
  if (!browser || !browser.isConnected()) {
    logger.debug("cloakbrowser.service.launch");
    browser = await launch({ headless: true });
  }
  return browser;
}

export async function withPage<T>(
  fn: (page: PlaywrightPage) => Promise<T>,
  options?: PageOptions,
): Promise<T> {
  const br = await ensureBrowser();
  const ua = options?.userAgent || getRandomUserAgent();
  const viewport = options?.viewport || DEFAULT_VIEWPORT;
  const timeoutMs = options?.timeoutMs || OPERATION_TIMEOUT_MS;

  const context = await br.newContext({
    viewport,
    userAgent: ua,
  });

  if (options?.cookies && options.cookies.length > 0) {
    await context.addCookies(options.cookies);
    logger.debug("cloakbrowser.service.cookies_injected", { count: options.cookies.length });
  }

  const page = await context.newPage();

  if (options?.stealth !== false) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        (parameters as { name: string }).name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters as PermissionDescriptor);
    });
  }

  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new OperationTimeoutError(`CloakBrowser operation exceeded ${timeoutMs}ms timeout`));
      }, timeoutMs);
    });

    const result = await Promise.race([fn(page), timeoutPromise]);
    return result;
  } catch (err) {
    if (err instanceof OperationTimeoutError) {
      logger.warn("cloakbrowser.service.operation_timeout", { timeoutMs });
      throw err;
    }
    throw err;
  } finally {
    await context.close().catch(() => {});
  }
}

export async function shutdown(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
    logger.debug("cloakbrowser.service.shutdown");
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
