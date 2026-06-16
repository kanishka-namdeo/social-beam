import Redis from 'ioredis';
import { logger } from './logger';

const globalForRedis = globalThis as unknown as {
  redis: Redis | null;
};

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.warn('redis.not_configured', { message: 'REDIS_URL not set, falling back to in-memory rate limiting' });
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('redis.connection_failed', { attempts: times });
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      logger.error('redis.error', { error: String(err) });
    });

    client.on('connect', () => {
      logger.info('redis.connected');
    });

    globalForRedis.redis = client;
    return client;
  } catch (err) {
    logger.error('redis.init_failed', { error: String(err) });
    return null;
  }
}

export const redis = globalForRedis.redis ?? createRedisClient();
globalForRedis.redis = redis;

export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}
