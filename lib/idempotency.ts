import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if an idempotency key exists and return cached response if found.
 * Returns null if key doesn't exist or has expired.
 */
export async function checkIdempotencyKey(
  key: string,
  userId: string
): Promise<{ response: any } | null> {
  try {
    const record = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (!record) {
      return null;
    }

    // Check if expired
    if (new Date() > record.expiresAt) {
      // Clean up expired record
      await prisma.idempotencyKey.delete({
        where: { key },
      });
      return null;
    }

    // Verify it belongs to the same user
    if (record.userId !== userId) {
      logger.warn('idempotency.key_user_mismatch', { key, userId });
      return null;
    }

    logger.info('idempotency.key.hit', { key, userId });
    return { response: record.response };
  } catch (error) {
    logger.error('idempotency.check.error', { key, userId, error: String(error) });
    return null;
  }
}

/**
 * Store a successful response for an idempotency key.
 */
export async function storeIdempotencyKey(
  key: string,
  userId: string,
  response: any
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

    await prisma.idempotencyKey.upsert({
      where: { key },
      update: {
        response,
        expiresAt,
      },
      create: {
        key,
        userId,
        response,
        expiresAt,
      },
    });

    logger.info('idempotency.key.stored', { key, userId });
  } catch (error) {
    logger.error('idempotency.store.error', { key, userId, error: String(error) });
    // Don't throw - idempotency is a best-effort feature
  }
}

/**
 * Extract idempotency key from request headers.
 */
export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get('Idempotency-Key');
}
