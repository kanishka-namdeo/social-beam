import { slidingWindowRateLimit } from './redis-rate-limiter';

const WINDOW_MS = 60_000; // 1 minute

const LIMITS: Record<string, number> = {
  'POST:/api/notifications': 10,
  'POST:/api/notifications/batch': 5,
  'POST:/api/notifications/batch-migrate': 1,
  'POST:/api/cron/publish': 3,
};

export async function checkApiRateLimit(
  method: string,
  pathname: string,
  userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `${method}:${pathname}`;
  const limit = LIMITS[key];
  if (!limit) return { allowed: true };

  const storeKey = `${key}:${userId}`;
  return slidingWindowRateLimit(storeKey, limit, WINDOW_MS);
}
