import { logger } from "@/lib/logger";
export { delay } from "@/lib/cloakbrowser";

// ─── Error Classes ─────────────────────────────────────────────────

/**
 * Typed error thrown when the LinkedIn li_at cookie has expired.
 * Callers can catch this to distinguish session expiry from other failures.
 */
export class LinkedInCookieExpiredError extends Error {
  constructor(message = "LINKEDIN_COOKIE_EXPIRED") {
    super(message);
    this.name = "LinkedInCookieExpiredError";
  }
}

/**
 * Typed error thrown when a LinkedIn browser operation exceeds the timeout.
 */
export class LinkedInOperationTimeoutError extends Error {
  constructor(message = "LINKEDIN_OPERATION_TIMEOUT") {
    super(message);
    this.name = "LinkedInOperationTimeoutError";
  }
}

/**
 * Typed error thrown when LinkedIn presents a CAPTCHA or challenge page.
 */
export class LinkedInCaptchaError extends Error {
  constructor(message = "LINKEDIN_CAPTCHA_DETECTED") {
    super(message);
    this.name = "LinkedInCaptchaError";
  }
}

// ─── Retry Utilities ───────────────────────────────────────────────

/**
 * Check if an error is retryable (not a session expiry).
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof LinkedInCookieExpiredError) return false;
  if (err instanceof Error && err.name === "LinkedInOperationTimeoutError") return true;
  return true;
}

/**
 * Exponential backoff delay with jitter.
 */
async function delayWithBackoff(attempt: number, baseDelayMs: number = 1000): Promise<void> {
  const backoffMs = baseDelayMs * Math.pow(2, attempt);
  await new Promise((resolve) => setTimeout(resolve, backoffMs + Math.random() * 200));
}

/**
 * Execute an operation with retry logic. Returns null on failure.
 *
 * Used by inbox scraper and other orchestrators that prefer null over throwing.
 * Triggers self-healer after all retries are exhausted.
 */
export async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxRetries: number = 3,
  selfHealerTarget: string = "inbox",
  workspaceId: string = "default",
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LinkedInCookieExpiredError) {
        logger.warn("linkedin.scraper.cookie_expired", { operation, error: err.message });
        return null;
      }
      if (attempt < maxRetries && isRetryableError(err)) {
        logger.warn("linkedin.scraper.retry_attempt", {
          operation,
          attempt: attempt + 1,
          maxRetries,
          error: String(err),
        });
        await delayWithBackoff(attempt);
      } else {
        logger.error("linkedin.scraper.operation_failed", {
          operation,
          attempts: attempt + 1,
          error: String(err),
        });

        // Self-healer trigger: after all retries exhausted
        if (attempt >= maxRetries) {
          triggerSelfHealerForScraper(selfHealerTarget, workspaceId);
        }

        return null;
      }
    }
  }
  return null;
}

/**
 * Execute a scraping operation with CAPTCHA detection and exponential backoff retry.
 * Throws on failure (unlike withRetry which returns null).
 *
 * Retries up to `maxRetries` times with delays of 5s, 10s (exponential backoff).
 * CAPTCHA and cookie-expired errors are thrown immediately without retry.
 */
export async function scrapeWithRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  maxRetries: number = 2,
): Promise<T> {
  const delays = [5000, 10000]; // 5s, 10s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LinkedInCaptchaError) {
        logger.error("linkedin.scrape.captcha", { operation: operationName, attempt });
        throw err;
      }
      if (err instanceof LinkedInCookieExpiredError) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = delays[attempt] ?? delays[delays.length - 1];
        logger.warn("linkedin.scrape.retry", {
          operation: operationName,
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: String(err),
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.error("linkedin.scrape.failed_after_retries", {
          operation: operationName,
          attempts: attempt + 1,
        });
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

// ─── Number Parsing ────────────────────────────────────────────────

/**
 * Parse a LinkedIn number string into a numeric value.
 *
 * Handles:
 * - K/M/B suffixes (e.g., "5K", "1.2M", "3B")
 * - Comma-separated numbers (e.g., "1,234")
 * - Percentage signs (e.g., "50%")
 * - "X others reacted" patterns (e.g., "2 others reacted")
 * - Plain numbers anywhere in text (e.g., "244 impressions")
 *
 * Merged from parseEngagementNumber (browser.ts) and parseNumber (creator-analytics-scraper.ts).
 */
export function parseLinkedInNumber(str: string): number {
  if (!str) return 0;

  const cleaned = str.trim().toLowerCase();

  // K suffix (e.g., "5K", "1.2K")
  const kMatch = cleaned.match(/^([\d.]+)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);

  // M suffix (e.g., "1.2M")
  const mMatch = cleaned.match(/^([\d.]+)\s*m/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);

  // B suffix (e.g., "3B")
  const bMatch = cleaned.match(/^([\d.]+)\s*b/);
  if (bMatch) return Math.round(parseFloat(bMatch[1]) * 1_000_000_000);

  // Percentage: extract number before % sign
  const pctMatch = cleaned.match(/^(-?\d+\.?\d*)\s*%?$/);
  if (pctMatch) return Math.round(parseFloat(pctMatch[1]));

  // Simple number at start (with commas)
  const numMatch = cleaned.replace(/,/g, "").match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  // Handle "Name and 2 others reacted" → extract the "2"
  const othersMatch = cleaned.match(/(\d+)\s*others?\s+react/i);
  if (othersMatch) return parseInt(othersMatch[1], 10);

  // Handle any number anywhere in text (fallback for "244 impressions")
  const anyNum = cleaned.match(/(\d[\d,]*)/);
  if (anyNum) return parseInt(anyNum[1].replace(/,/g, ""), 10);

  return 0;
}

/**
 * Parse an engagement rate percentage string to a decimal.
 * Handles formats like "3.2%", "3.2", "0.032", "3.2K%".
 */
export function parseEngagementRate(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().toLowerCase().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*%/);
  if (match) {
    return parseFloat(match[1]) / 100;
  }
  const num = parseFloat(cleaned);
  if (num > 1) return num / 100; // Assume percentage if > 1
  return num;
}

// ─── URL Utilities ─────────────────────────────────────────────────

/**
 * Extract a post URN from a LinkedIn URL.
 * URLs look like:
 * - https://www.linkedin.com/feed/update/urn:li:activity:7123456789/
 * - https://www.linkedin.com/posts/username_activity-7123456789-AbCd/
 * - https://www.linkedin.com/posts/username_share-7123456789-AbCd/
 */
export function extractPostUrnFromUrl(url: string): string | null {
  // Try /feed/update/urn:li:activity:xxx format
  const feedMatch = url.match(/\/feed\/update\/(urn:li:[^\/\?]+)/);
  if (feedMatch) return feedMatch[1];

  // Try /posts/..._activity-xxx-... format
  const activityMatch = url.match(/activity[-:](\d+)/);
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`;

  // Try /posts/..._share-xxx-... format
  const shareMatch = url.match(/share[-:](\d+)/);
  if (shareMatch) return `urn:li:share:${shareMatch[1]}`;

  return null;
}

/**
 * Extract the numeric share ID from a LinkedIn URN.
 * Handles:
 * - urn:li:share:123456789
 * - urn:li:activity:123456789
 * - urn:li:ugcPost:123456789
 * - Plain numeric strings
 */
export function extractShareId(urn: string): string | null {
  if (urn.includes("urn:li:")) {
    const parts = urn.split(":");
    return parts[parts.length - 1] ?? null;
  }
  if (/^\d+$/.test(urn)) {
    return urn;
  }
  return null;
}

/**
 * Normalize a LinkedIn URL — prepend https://www.linkedin.com if relative.
 */
export function normalizeUrl(raw: string): string {
  if (raw.startsWith("http")) return raw;
  return `https://www.linkedin.com${raw}`;
}

// ─── Self-Healer Trigger ──────────────────────────────────────────

/**
 * Fire-and-forget self-healer trigger for scraper failures.
 * Imports the self-healer module dynamically to avoid blocking the main flow.
 */
export function triggerSelfHealerForScraper(
  scraperType: string,
  workspaceId: string = "default",
): void {
  import("@/lib/agent/self-healer/trigger").then(({ triggerSelfHealer }) =>
    triggerSelfHealer(scraperType, workspaceId).catch(() => {}),
  ).catch(() => {});
}

// ─── Page Detection ────────────────────────────────────────────────

/**
 * Check if a URL is a LinkedIn login page.
 * Used to detect expired cookies or session redirects.
 */
export function isLinkedInLoginPage(url: string): boolean {
  return url.includes("/login") || url.includes("/uas/oauth");
}
