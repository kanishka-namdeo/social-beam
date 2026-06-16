import { redis, isRedisAvailable } from './redis';
import { alertHighErrorRate } from './alerting';
import { logger } from './logger';

const ERROR_RATE_KEY = 'error_rate:count';
const ALERT_THRESHOLD_KEY = 'error_rate:last_alerted';
const WINDOW_SECONDS = 60; // 1-minute sliding window
const ALERT_COOLDOWN_SECONDS = 300; // 5 minutes between alerts

/**
 * Increment the error counter in Redis for the current minute window.
 * Falls back to in-memory tracking if Redis is unavailable.
 */
export async function recordError(reason?: string): Promise<void> {
  if (isRedisAvailable() && redis) {
    try {
      const pipeline = redis.pipeline();
      pipeline.incr(ERROR_RATE_KEY);
      pipeline.expire(ERROR_RATE_KEY, WINDOW_SECONDS);
      await pipeline.exec();
    } catch (err) {
      logger.error('error_rate.record_failed', { error: String(err) });
    }
  }
}

/**
 * Get the current error count within the sliding window.
 */
export async function getErrorCount(): Promise<number> {
  if (isRedisAvailable() && redis) {
    try {
      const count = await redis.get(ERROR_RATE_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch (err) {
      logger.error('error_rate.read_failed', { error: String(err) });
      return 0;
    }
  }
  return 0;
}

/**
 * Check the current error rate and trigger an alert if it exceeds the threshold.
 * Implements a cooldown to prevent alert spam.
 */
export async function checkErrorRate(threshold = 10): Promise<boolean> {
  const count = await getErrorCount();
  if (count < threshold) return false;

  // Check cooldown
  if (isRedisAvailable() && redis) {
    try {
      const lastAlerted = await redis.get(ALERT_THRESHOLD_KEY);
      if (lastAlerted) {
        const elapsed = Date.now() - parseInt(lastAlerted, 10);
        if (elapsed < ALERT_COOLDOWN_SECONDS * 1000) {
          logger.warn('error_rate.alert_cooldown_active', { count, threshold });
          return false;
        }
      }

      // Update cooldown timestamp
      await redis.set(ALERT_THRESHOLD_KEY, Date.now().toString(), 'EX', ALERT_COOLDOWN_SECONDS);
    } catch (err) {
      logger.error('error_rate.cooldown_check_failed', { error: String(err) });
    }
  }

  await alertHighErrorRate(count);
  return true;
}

/**
 * Middleware-compatible wrapper that records errors on failed responses.
 * Returns a function that wraps a handler and tracks 5xx errors.
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  errorLabel?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      recordError(errorLabel);
      throw error;
    }
  }) as T;
}
