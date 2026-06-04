import { launch } from "cloakbrowser";
import { logger } from "@/lib/logger";
import type { PageOptions } from "./types";
import { CookieExpiredError, OperationTimeoutError } from "./errors";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

type PlaywrightBrowser = Awaited<ReturnType<typeof launch>>;
type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<PlaywrightBrowser["newContext"]>>["newPage"]>>;

const OPERATION_TIMEOUT_MS = 30_000;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const STORAGE_STATE_PATH = join(process.cwd(), ".data", "linkedin-storage-state.json");
const BROWSER_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function ensureStorageDir(): void {
  const dir = join(process.cwd(), ".data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function saveStorageState(context: Awaited<ReturnType<PlaywrightBrowser["newContext"]>>): Promise<void> {
  try {
    ensureStorageDir();
    const state = await context.storageState();
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
    logger.debug("cloakbrowser.service.storage_state_saved", { cookieCount: state.cookies?.length ?? 0 });
  } catch (err) {
    logger.warn("cloakbrowser.service.storage_state_save_failed", { error: String(err) });
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

let browser: PlaywrightBrowser | undefined;
let visibleBrowser: PlaywrightBrowser | undefined;
let browserLastUsed: number = Date.now();
let visibleBrowserLastUsed: number = Date.now();
let idleCheckInterval: ReturnType<typeof setInterval> | undefined;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Check and close idle browsers to prevent memory leaks.
 * Runs every 60 seconds to close browsers unused for >5 minutes.
 */
function startIdleCheck(): void {
  if (idleCheckInterval) return;
  idleCheckInterval = setInterval(async () => {
    const now = Date.now();
    if (browser && now - browserLastUsed > BROWSER_IDLE_TIMEOUT_MS) {
      logger.debug("cloakbrowser.service.idle_close_headless");
      await browser.close().catch(() => {});
      browser = undefined;
    }
    if (visibleBrowser && now - visibleBrowserLastUsed > BROWSER_IDLE_TIMEOUT_MS) {
      logger.debug("cloakbrowser.service.idle_close_visible");
      await visibleBrowser.close().catch(() => {});
      visibleBrowser = undefined;
    }
  }, 60_000);
}

async function ensureBrowser(headless = true): Promise<PlaywrightBrowser> {
  startIdleCheck();
  if (headless) {
    if (!browser || !browser.isConnected()) {
      logger.debug("cloakbrowser.service.launch");
      browser = await launch({ headless: true });
    }
    browserLastUsed = Date.now();
    return browser;
  }
  if (!visibleBrowser || !visibleBrowser.isConnected()) {
    logger.debug("cloakbrowser.service.launch_visible");
    visibleBrowser = await launch({ headless: false });
  }
  visibleBrowserLastUsed = Date.now();
  return visibleBrowser;
}

export async function withPage<T>(
  fn: (page: PlaywrightPage) => Promise<T>,
  options?: PageOptions & { headless?: boolean; saveStorageState?: boolean },
): Promise<T> {
  const headless = options?.headless ?? true;
  const br = await ensureBrowser(headless);
  const viewport = options?.viewport || DEFAULT_VIEWPORT;
  const timeoutMs = options?.timeoutMs || OPERATION_TIMEOUT_MS;

  // Load saved storage state if available (preserves full LinkedIn session)
  let storageState: string | undefined;
  if (existsSync(STORAGE_STATE_PATH)) {
    try {
      const state = JSON.parse(readFileSync(STORAGE_STATE_PATH, "utf-8"));
      if (state.cookies?.length > 0) {
        storageState = STORAGE_STATE_PATH;
        logger.debug("cloakbrowser.service.storage_state_loaded", { cookieCount: state.cookies.length });
      }
    } catch {}
  }

  // When loading storage state, don't override user agent — must match the saved state
  const contextOptions: Parameters<typeof br.newContext>[0] = {
    viewport,
    userAgent: storageState ? undefined : (options?.userAgent || getRandomUserAgent()),
    storageState,
  };

  const context = await br.newContext(contextOptions);

  if (options?.cookies && options.cookies.length > 0 && !storageState) {
    await context.addCookies(options.cookies);
    logger.debug("cloakbrowser.service.cookies_injected", { count: options.cookies.length });
  }

  const page = await context.newPage();

  // Inject __name shim to fix tsx/esbuild compatibility with page.evaluate
  // tsx injects __name() calls for keep-names, but browser context doesn't have it
  // Using context.addInitScript so it persists across navigations
  await context.addInitScript(() => {
    (globalThis as any).__name = (target: Function, _value: string) => target;
  });

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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new OperationTimeoutError(`CloakBrowser operation exceeded ${timeoutMs}ms timeout`));
      }, timeoutMs);
    });

    const result = await Promise.race([fn(page), timeoutPromise]);

    // Save storage state after successful operation
    if (options?.saveStorageState) {
      await saveStorageState(context);
    }

    return result;
  } catch (err) {
    if (err instanceof OperationTimeoutError) {
      logger.warn("cloakbrowser.service.operation_timeout", { timeoutMs });
      throw err;
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    await context.close().catch(() => {});
  }
}

export async function shutdown(): Promise<void> {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = undefined;
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
    logger.debug("cloakbrowser.service.shutdown");
  }
  if (visibleBrowser) {
    await visibleBrowser.close().catch(() => {});
    visibleBrowser = undefined;
    logger.debug("cloakbrowser.service.shutdown_visible");
  }
}

// Register process exit handlers for graceful browser cleanup
if (typeof process !== 'undefined') {
  process.on('beforeExit', shutdown);
  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
