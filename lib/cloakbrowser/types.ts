export interface PlatformScraperResult<T> {
  success: boolean;
  data: T[];
  error?: string;
  method: "browser" | "api" | "hybrid";
}

export interface PageOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  cookies?: { name: string; value: string; domain: string; path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: "Strict" | "Lax" | "None" }[];
  stealth?: boolean;
  timeoutMs?: number;
}
