import { redis, isRedisAvailable } from './redis';
import { logger } from './logger';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

interface InMemoryEntry {
  timestamps: number[];
}

const inMemoryStore = new Map<string, InMemoryEntry>();
const MAX_STORE_SIZE = 10_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function evictOldestEntries(): void {
  const entries = Array.from(inMemoryStore.entries())
    .sort((a, b) => {
      const aOldest = a[1].timestamps[0] ?? 0;
      const bOldest = b[1].timestamps[0] ?? 0;
      return aOldest - bOldest;
    });
  const toRemove = Math.floor(inMemoryStore.size * 0.25);
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    inMemoryStore.delete(entries[i][0]);
  }
}

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
      if (entry.timestamps.length === 0) {
        inMemoryStore.delete(key);
      }
    }
    if (inMemoryStore.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60_000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

function checkInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let entry = inMemoryStore.get(key);

  if (!entry) {
    if (inMemoryStore.size >= MAX_STORE_SIZE) {
      evictOldestEntries();
    }
    entry = { timestamps: [] };
    inMemoryStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    startCleanup();
    return { allowed: false, retryAfter };
  }

  entry.timestamps.push(now);
  startCleanup();
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

async function checkRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!redis) return checkInMemory(key, limit, windowMs);

  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zadd(redisKey, now, `${now}:${Math.random()}`);
    multi.zcard(redisKey);
    multi.pexpire(redisKey, windowMs);

    const results = await multi.exec();
    if (!results) return checkInMemory(key, limit, windowMs);

    const count = results[2]?.[1] as number;
    if (count > limit) {
      const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const oldestScore = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
      const retryAfter = Math.ceil((oldestScore + windowMs - now) / 1000);
      return { allowed: false, retryAfter, remaining: 0 };
    }

    return { allowed: true, remaining: limit - count };
  } catch (err) {
    logger.warn('redis.rate_limit_fallback', { error: String(err), key });
    return checkInMemory(key, limit, windowMs);
  }
}

export async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  if (isRedisAvailable()) {
    return checkRedis(key, limit, windowMs);
  }
  return checkInMemory(key, limit, windowMs);
}
