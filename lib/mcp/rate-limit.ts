import { slidingWindowRateLimit } from '../redis-rate-limiter';

export async function checkRateLimit(userId: string, limit = 100, windowMs = 60000): Promise<boolean> {
  const result = await slidingWindowRateLimit(`mcp:${userId}`, limit, windowMs);
  return result.allowed;
}

export async function resetRateLimit(userId: string): Promise<void> {
  const { redis } = await import('../redis');
  if (redis) {
    await redis.del(`mcp:${userId}`);
  }
}

export async function getRateLimitInfo(userId: string, limit = 100): Promise<{ remaining: number; resetIn: number } | null> {
  const result = await slidingWindowRateLimit(`mcp:${userId}`, limit, 60000);
  if (result.remaining === undefined) return null;
  return { remaining: result.remaining, resetIn: 60000 };
}
