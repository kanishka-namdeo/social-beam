import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { logger } from "@/lib/logger";

const COOKIE_DIR = join(process.cwd(), ".data");

export function loadCookie(platform: string, envVar?: string): string | null {
  if (envVar && process.env[envVar]) {
    const value = process.env[envVar]!.trim();
    if (value.length > 5) {
      logger.info("cloakbrowser.cookie_loaded_from_env", { platform, envVar });
      return value;
    }
  }

  const fileCookie = loadCookieFromFile(platform);
  if (fileCookie) return fileCookie;

  logger.warn("cloakbrowser.no_cookie", { platform });
  return null;
}

function loadCookieFromFile(platform: string): string | null {
  const cookieFile = join(COOKIE_DIR, `${platform}-cookie.txt`);
  try {
    if (!existsSync(cookieFile)) return null;
    const cookie = readFileSync(cookieFile, "utf-8").trim();
    if (cookie.length > 5) {
      logger.info("cloakbrowser.cookie_loaded_from_cache", { platform });
      return cookie;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCookie(platform: string, cookie: string): void {
  try {
    if (!existsSync(COOKIE_DIR)) {
      mkdirSync(COOKIE_DIR, { recursive: true });
    }
    const cookieFile = join(COOKIE_DIR, `${platform}-cookie.txt`);
    writeFileSync(cookieFile, cookie, "utf-8");
    logger.info("cloakbrowser.cookie_saved_to_cache", { platform });
  } catch (err) {
    logger.warn("cloakbrowser.cookie_save_failed", { platform, error: String(err) });
  }
}
