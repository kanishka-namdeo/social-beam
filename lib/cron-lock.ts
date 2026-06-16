import { prisma } from './prisma';
import { logger } from './logger';

/**
 * DB-backed cron lock using PostgreSQL advisory locks.
 * Prevents duplicate cron execution in multi-instance deployments.
 */

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour default

/**
 * Attempt to acquire a cron lock using PostgreSQL advisory lock.
 * @param lockName - Unique name for the lock (e.g., 'cron:publish')
 * @param timeoutMs - Lock timeout in milliseconds (default: 1 hour)
 * @returns Lock object with release function, or null if lock not acquired
 */
export async function acquireCronLock(
  lockName: string,
  timeoutMs: number = LOCK_TIMEOUT_MS
): Promise<{ release: () => Promise<void>; acquiredAt: Date } | null> {
  // Generate a stable lock ID from the lock name (must be a bigint for pg_advisory_lock)
  const lockId = BigInt(hashString(lockName));

  try {
    // Try to acquire advisory lock (non-blocking)
    const result = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
      SELECT pg_try_advisory_lock(${lockId})
    `;

    const lockAcquired = result[0]?.pg_try_advisory_lock === true;

    if (!lockAcquired) {
      logger.debug('cron_lock.not_acquired', { lockName, lockId: lockId.toString() });
      return null;
    }

    const acquiredAt = new Date();
    logger.info('cron_lock.acquired', { lockName, lockId: lockId.toString(), acquiredAt });

    // Set up automatic release after timeout
    const timeoutHandle = setTimeout(async () => {
      logger.warn('cron_lock.timeout_released', { lockName, timeoutMs });
      await releaseLock();
    }, timeoutMs);

    // Prevent timeout from keeping process alive
    if (timeoutHandle.unref) {
      timeoutHandle.unref();
    }

    const releaseLock = async () => {
      clearTimeout(timeoutHandle);
      try {
        await prisma.$queryRaw`
          SELECT pg_advisory_unlock(${lockId})
        `;
        logger.info('cron_lock.released', { lockName, lockId: lockId.toString() });
      } catch (error) {
        logger.error('cron_lock.release_failed', { 
          lockName, 
          lockId: lockId.toString(),
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    return { release: releaseLock, acquiredAt };
  } catch (error) {
    logger.error('cron_lock.acquire_failed', { 
      lockName, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Hash a string to a 64-bit integer for use as PostgreSQL advisory lock ID.
 * Uses a simple hash function that produces consistent results.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive 64-bit safe integer
  return Math.abs(hash);
}

/**
 * Execute a function with a cron lock.
 * Automatically releases the lock after the function completes or throws.
 * @param lockName - Unique name for the lock
 * @param fn - Function to execute while holding the lock
 * @param timeoutMs - Lock timeout in milliseconds
 * @returns Result of the function, or null if lock not acquired
 */
export async function withCronLock<T>(
  lockName: string,
  fn: () => Promise<T>,
  timeoutMs: number = LOCK_TIMEOUT_MS
): Promise<T | null> {
  const lock = await acquireCronLock(lockName, timeoutMs);
  
  if (!lock) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
