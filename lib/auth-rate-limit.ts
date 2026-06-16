import { slidingWindowRateLimit } from './redis-rate-limiter';

const WINDOW_MS = 60_000;

const LIMITS: Record<string, number> = {
  '/api/auth/login': 5,
  '/api/auth/register': 3,
  '/api/auth/forgot-password': 3,
  '/api/auth/reset-password': 5,
};

export async function checkAuthRateLimit(
  ip: string,
  endpoint: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limit = LIMITS[endpoint];
  if (!limit) return { allowed: true };

  const key = `${endpoint}:${ip}`;
  return slidingWindowRateLimit(key, limit, WINDOW_MS);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
