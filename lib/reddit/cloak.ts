import { launch } from "cloakbrowser";
import { logger } from "@/lib/logger";

type PlaywrightBrowser = Awaited<ReturnType<typeof launch>>;
type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<PlaywrightBrowser["newContext"]>>["newPage"]>>;

let browser: PlaywrightBrowser | undefined;

async function ensureBrowser(): Promise<PlaywrightBrowser> {
  if (!browser || !browser.isConnected()) {
    logger.debug("reddit.cloak.browser_launch");
    browser = await launch({ headless: true });
  }
  return browser;
}

export async function withPage<T>(fn: (page: PlaywrightPage) => Promise<T>): Promise<T> {
  const br = await ensureBrowser();
  const context = await br.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close().catch(() => {});
  }
}

export async function shutdownBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
  }
}
