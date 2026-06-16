import { launch, launchPersistentContext } from "cloakbrowser";
import { chromium } from "playwright";
import { logger } from "@/lib/logger";
import type { PageOptions } from "./types";
import { CookieExpiredError, OperationTimeoutError } from "./errors";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

type PlaywrightBrowser = Awaited<ReturnType<typeof launch>>;
type PlaywrightBrowserContext = Awaited<ReturnType<typeof launchPersistentContext>>;
type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<PlaywrightBrowser["newContext"]>>["newPage"]>>;

// Remote CDP connection support
const CLOAKBROWSER_CDP_URL = process.env.CLOAKBROWSER_CDP_URL;
let remoteBrowser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;

const OPERATION_TIMEOUT_MS = 30_000;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const STORAGE_STATE_PATH = join(process.cwd(), ".data", "linkedin-storage-state.json");
const BROWSER_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const FINGERPRINT_SEEDS_PATH = join(process.cwd(), ".data", "linkedin-fingerprint-seeds.json");

/**
 * Generate or retrieve a stable fingerprint seed for a given workspace.
 * Seeds are persisted to .data/linkedin-fingerprint-seeds.json so the same
 * workspace always gets the same device identity across restarts.
 */
function getFingerprintSeed(workspaceId: string): string {
  let seeds: Record<string, string> = {};
  if (existsSync(FINGERPRINT_SEEDS_PATH)) {
    try {
      seeds = JSON.parse(readFileSync(FINGERPRINT_SEEDS_PATH, "utf-8"));
    } catch {
      seeds = {};
    }
  }
  if (!seeds[workspaceId]) {
    seeds[workspaceId] = Math.floor(Math.random() * 90000 + 10000).toString();
    try {
      writeFileSync(FINGERPRINT_SEEDS_PATH, JSON.stringify(seeds, null, 2), "utf-8");
    } catch {}
  }
  return seeds[workspaceId];
}

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
let persistentContext: PlaywrightBrowserContext | undefined;
let persistentContextWorkspaceId: string | undefined;
let browserLastUsed: number = Date.now();
let visibleBrowserLastUsed: number = Date.now();
let persistentContextLastUsed: number = Date.now();
let idleCheckInterval: ReturnType<typeof setInterval> | undefined;

// Mutex to prevent concurrent browser launches (prevents orphaned Chromium processes)
let headlessLaunchLock: Promise<PlaywrightBrowser> | undefined;
let visibleLaunchLock: Promise<PlaywrightBrowser> | undefined;
let persistentLaunchLock: Promise<PlaywrightBrowserContext> | undefined;
let idleCheckInProgress = false;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Check and close idle browsers to prevent memory leaks.
 * Runs every 60 seconds to close browsers unused for >5 minutes.
 */
function startIdleCheck(): void {
  if (idleCheckInterval) return;
  idleCheckInterval = setInterval(() => {
    // Prevent overlapping idle checks
    if (idleCheckInProgress) return;
    
    idleCheckInProgress = true;
    
    (async () => {
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
      if (persistentContext && now - persistentContextLastUsed > BROWSER_IDLE_TIMEOUT_MS) {
        logger.debug("cloakbrowser.service.idle_close_persistent");
        await persistentContext.close().catch(() => {});
        persistentContext = undefined;
        persistentContextWorkspaceId = undefined;
      }
    })().finally(() => {
      idleCheckInProgress = false;
    });
  }, 60_000);
  idleCheckInterval.unref();
}

/**
 * Detect if running inside a container with Xvfb virtual display.
 * When true, add off-screen window positioning as a safety net.
 */
function isXvfbEnvironment(): boolean {
  return !!process.env.DISPLAY || !!process.env.XVFB_DISPLAY;
}

/**
 * Connect to remote CloakBrowser via CDP.
 * Used when CLOAKBROWSER_CDP_URL is set (e.g., Docker container running CloakBrowser).
 */
async function getRemoteBrowser(): Promise<Awaited<ReturnType<typeof chromium.connectOverCDP>>> {
  if (!remoteBrowser || !remoteBrowser.isConnected()) {
    logger.info("cloakbrowser.service.connect_remote_cdp", { endpoint: CLOAKBROWSER_CDP_URL });
    try {
      remoteBrowser = await chromium.connectOverCDP(CLOAKBROWSER_CDP_URL!);
      logger.info("cloakbrowser.service.remote_cdp_connected");
    } catch (err) {
      remoteBrowser = undefined;
      throw err;
    }
  }
  return remoteBrowser;
}

/**
 * Browser launch args for Xvfb/virtual display environments.
 * Uses CloakBrowser's fingerprint screen positioning instead of the old
 * --window-position=-32000,-32000 workaround. The C++ patch handles
 * window.screenX/Y spoofing automatically.
 */
function getXvfbArgs(): string[] {
  return [
    '--fingerprint-screen-width=1920',
    '--fingerprint-screen-height=1080',
    '--fingerprint-screen-position-x=0',
    '--fingerprint-screen-position-y=0',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
  ];
}

async function ensureBrowser(headless = true): Promise<PlaywrightBrowser> {
  startIdleCheck();

  // Remote CDP mode: connect to Docker-hosted CloakBrowser
  if (CLOAKBROWSER_CDP_URL) {
    const remote = await getRemoteBrowser();
    const contexts = remote.contexts();
    if (contexts.length > 0) {
      // Return the first context as the "browser" for compatibility
      return contexts[0] as any;
    }
    // Create a new context if none exists
    const ctx = await remote.newContext();
    return ctx as any;
  }

  // Local mode: launch CloakBrowser directly
  const runningInXvfb = isXvfbEnvironment();
  const launchArgs = runningInXvfb ? getXvfbArgs() : [];

  if (headless) {
    if (!browser || !browser.isConnected()) {
      // Use mutex to prevent concurrent launches
      if (!headlessLaunchLock) {
        headlessLaunchLock = (async () => {
          logger.debug("cloakbrowser.service.launch");
          const b = await launch({
            headless: true,
            ...(launchArgs.length > 0 && { args: launchArgs }),
          });
          return b;
        })().finally(() => {
          headlessLaunchLock = undefined;
        });
      }
      browser = await headlessLaunchLock;
    }
    browserLastUsed = Date.now();
    return browser;
  }
  
  if (!visibleBrowser || !visibleBrowser.isConnected()) {
    // Use mutex to prevent concurrent launches
    if (!visibleLaunchLock) {
      visibleLaunchLock = (async () => {
        logger.debug("cloakbrowser.service.launch_visible");
        const b = await launch({
          headless: false,
          ...(launchArgs.length > 0 && { args: launchArgs }),
        });
        return b;
      })().finally(() => {
        visibleLaunchLock = undefined;
      });
    }
    visibleBrowser = await visibleLaunchLock;
  }
  visibleBrowserLastUsed = Date.now();
  return visibleBrowser;
}

/**
 * Launch or reuse a persistent browser context for LinkedIn scraping.
 * Uses CloakBrowser's launchPersistentContext with humanize mode,
 * fingerprint seed, and optional proxy support.
 *
 * @param workspaceId - Used to retrieve/generate a stable fingerprint seed
 * @param options - Launch options including headless, proxy, etc.
 */
export async function ensurePersistentBrowser(
  workspaceId: string,
  options?: { headless?: boolean; proxy?: string; geoip?: boolean },
): Promise<PlaywrightBrowserContext> {
  startIdleCheck();

  // Remote CDP mode: connect to Docker-hosted CloakBrowser
  if (CLOAKBROWSER_CDP_URL) {
    // Close old context if workspace changed
    if (persistentContext && persistentContextWorkspaceId !== workspaceId) {
      logger.debug("cloakbrowser.service.close_workspace_context", {
        from: persistentContextWorkspaceId,
        to: workspaceId,
      });
      await persistentContext.close().catch(() => {});
      persistentContext = undefined;
    }

    if (!persistentContext || !persistentContext.pages().length) {
      logger.debug("cloakbrowser.service.connect_remote_persistent", { workspaceId });
      const remote = await getRemoteBrowser();
      const contexts = remote.contexts();
      
      if (contexts.length > 0) {
        // Use the default context from the remote browser
        persistentContext = contexts[0] as any;
        logger.debug("cloakbrowser.service.remote_context_reused", { workspaceId });
      } else {
        // Create a new context
        persistentContext = await remote.newContext() as any;
        logger.debug("cloakbrowser.service.remote_context_created", { workspaceId });
      }

      // Inject __name shim for tsx/esbuild compatibility
      await persistentContext!.addInitScript(() => {
        (globalThis as any).__name = (target: Function, _value: string) => target;
      });

      persistentContextWorkspaceId = workspaceId;
    }
    persistentContextLastUsed = Date.now();
    return persistentContext!;
  }

  // Local mode: launch CloakBrowser directly
  const runningInXvfb = isXvfbEnvironment();
  const launchArgs = runningInXvfb ? getXvfbArgs() : [];

  const headless = options?.headless ?? false;
  const userDataDir = join(process.cwd(), ".data", "linkedin-profiles", workspaceId);
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });

  // Close old context if workspace changed
  if (persistentContext && persistentContextWorkspaceId !== workspaceId) {
    logger.debug("cloakbrowser.service.close_workspace_context", {
      from: persistentContextWorkspaceId,
      to: workspaceId,
    });
    await persistentContext.close().catch(() => {});
    persistentContext = undefined;
  }

  if (!persistentContext || !persistentContext.pages().length) {
    // Use mutex to prevent concurrent launches
    if (!persistentLaunchLock) {
      persistentLaunchLock = (async () => {
        logger.debug("cloakbrowser.service.launch_persistent");
        const fingerprintSeed = getFingerprintSeed(workspaceId);

        const ctx = await launchPersistentContext({
          userDataDir,
          headless,
          proxy: options?.proxy,
          geoip: options?.geoip,
          humanize: true,
          humanPreset: "careful",
          args: [...launchArgs, `--fingerprint=${fingerprintSeed}`],
        });

        // Inject __name shim for tsx/esbuild compatibility
        await ctx.addInitScript(() => {
          (globalThis as any).__name = (target: Function, _value: string) => target;
        });

        persistentContextWorkspaceId = workspaceId;
        logger.debug("cloakbrowser.service.persistent_context_ready", { workspaceId, fingerprintSeed });
        return ctx;
      })().finally(() => {
        persistentLaunchLock = undefined;
      });
    }
    persistentContext = await persistentLaunchLock;
  }
  persistentContextLastUsed = Date.now();
  return persistentContext;
}

/**
 * Execute a function with a new page from the persistent browser context.
 * Unlike withPage(), this does NOT close the page after use — it reuses
 * the persistent context's existing page to maintain session continuity.
 */
export async function withPersistentPage<T>(
  workspaceId: string,
  options: { headless?: boolean; proxy?: string; geoip?: boolean; timeoutMs?: number; cookies?: { name: string; value: string; domain: string; path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: "Strict" | "Lax" | "None" }[] },
  fn: (page: PlaywrightPage) => Promise<T>,
): Promise<T> {
  const ctx = await ensurePersistentBrowser(workspaceId, options);
  const timeoutMs = options?.timeoutMs || OPERATION_TIMEOUT_MS;

  // Reuse existing page or create a new one
  const existingPages = ctx.pages();
  let page: PlaywrightPage;
  let pageIsOwned = false; // Track if we created a new page (vs reusing)
  if (existingPages.length > 0) {
    try {
      // Quick health check -- verify page hasn't crashed
      await existingPages[0].evaluate(() => document.readyState).catch(() => { throw new Error('page_unhealthy'); });
      page = existingPages[0];
      // Reused page - don't close it in finally
    } catch {
      // Close the unhealthy page before creating a new one to prevent zombie accumulation
      await existingPages[0].close().catch(() => {});
      page = await ctx.newPage();
      pageIsOwned = true;
    }
  } else {
    page = await ctx.newPage();
    pageIsOwned = true;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new OperationTimeoutError(`CloakBrowser persistent operation exceeded ${timeoutMs}ms timeout`));
      }, timeoutMs);
    });

    // Inject cookies if provided
    if (options?.cookies && options.cookies.length > 0) {
      await ctx.addCookies(options.cookies);
    }

    return await Promise.race([fn(page), timeoutPromise]);
  } catch (err) {
    if (err instanceof OperationTimeoutError) {
      logger.warn("cloakbrowser.service.operation_timeout", { timeoutMs, persistent: true });
      throw err;
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    // Only close pages we created - reused pages should persist for session continuity
    if (pageIsOwned) {
      await page.close().catch(() => {});
    }
  }
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
  try {
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
    }
  } finally {
    await context.close().catch(() => {});
  }
}

export async function shutdown(): Promise<void> {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = undefined;
  }
  if (remoteBrowser) {
    await remoteBrowser.close().catch(() => {});
    remoteBrowser = undefined;
    logger.debug("cloakbrowser.service.shutdown_remote_cdp");
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
  if (persistentContext) {
    await persistentContext.close().catch(() => {});
    persistentContext = undefined;
    persistentContextWorkspaceId = undefined;
    logger.debug("cloakbrowser.service.shutdown_persistent");
  }
}

// Register process exit handlers for graceful browser cleanup
// Guard against multiple registrations during hot-reload
if (typeof process !== 'undefined' && !(global as any).__cloakbrowserHandlersRegistered) {
  (global as any).__cloakbrowserHandlersRegistered = true;
  process.on('beforeExit', shutdown);
  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });
  process.on('uncaughtException', async (err) => {
    logger.fatal("cloakbrowser.service.uncaught_exception", { error: String(err) });
    await shutdown();
    // Don't call process.exit() - let the application decide whether to terminate
    // uncaughtException is meant for recovery, not forced termination
  });
  process.on('unhandledRejection', async (reason) => {
    logger.fatal("cloakbrowser.service.unhandled_rejection", { reason: String(reason) });
    await shutdown();
    // Don't call process.exit() - let the application decide whether to terminate
    // unhandledRejection is meant for recovery, not forced termination
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
