import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface DLQEntry {
  entityType: string;
  entityId: string;
  error: string;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

export interface DLQEntryWithId {
  id: string;
  entityType: string;
  entityId: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  metadata: Record<string, unknown> | undefined;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add a failed item to the dead letter queue.
 */
export async function addToDLQ(entry: DLQEntry): Promise<string> {
  const dlqEntry = await prisma.deadLetterQueue.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      error: entry.error,
      maxRetries: entry.maxRetries ?? 3,
      metadata: (entry.metadata ?? null) as any,
    },
  });

  logger.warn('dlq.entry_added', {
    id: dlqEntry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    error: entry.error,
  });

  return dlqEntry.id;
}

/**
 * List DLQ entries with optional filters.
 */
export async function listDLQEntries(opts?: {
  entityType?: string;
  status?: 'pending' | 'retrying' | 'exhausted';
  limit?: number;
  offset?: number;
}): Promise<DLQEntryWithId[]> {
  const entries = await prisma.deadLetterQueue.findMany({
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
  });

  let filtered = entries;

  if (opts?.entityType) {
    filtered = filtered.filter(e => e.entityType === opts.entityType);
  }

  if (opts?.status === 'exhausted') {
    filtered = filtered.filter(e => e.retryCount >= e.maxRetries);
  } else if (opts?.status === 'pending') {
    filtered = filtered.filter(e => e.retryCount < e.maxRetries);
  }

  return filtered.map(e => ({
    id: e.id,
    entityType: e.entityType,
    entityId: e.entityId,
    error: e.error,
    retryCount: e.retryCount,
    maxRetries: e.maxRetries,
    nextRetryAt: e.nextRetryAt,
    metadata: (e.metadata as Record<string, unknown>) ?? undefined,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));
}

/**
 * Get total count of DLQ entries.
 */
export async function getDLQCount(opts?: { entityType?: string }): Promise<number> {
  return prisma.deadLetterQueue.count({
    where: opts?.entityType ? { entityType: opts.entityType } : undefined,
  });
}

/**
 * Get a single DLQ entry by ID.
 */
export async function getDLQEntry(id: string): Promise<DLQEntryWithId | null> {
  const entry = await prisma.deadLetterQueue.findUnique({ where: { id } });
  if (!entry) return null;
  return {
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    error: entry.error,
    retryCount: entry.retryCount,
    maxRetries: entry.maxRetries,
    nextRetryAt: entry.nextRetryAt,
    metadata: (entry.metadata as Record<string, unknown>) ?? undefined,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * Increment retry count and schedule next retry.
 */
export async function scheduleDLQRetry(id: string, delayMs: number = 60_000): Promise<boolean> {
  const entry = await prisma.deadLetterQueue.findUnique({ where: { id } });
  if (!entry) {
    logger.warn('dlq.retry_not_found', { id });
    return false;
  }

  if (entry.retryCount >= entry.maxRetries) {
    logger.warn('dlq.retry_exhausted', { id, retryCount: entry.retryCount, maxRetries: entry.maxRetries });
    return false;
  }

  await prisma.deadLetterQueue.update({
    where: { id },
    data: {
      retryCount: { increment: 1 },
      nextRetryAt: new Date(Date.now() + delayMs),
    },
  });

  logger.info('dlq.retry_scheduled', { id, nextRetryAt: new Date(Date.now() + delayMs).toISOString() });
  return true;
}

/**
 * Remove a DLQ entry (e.g., after successful manual retry).
 */
export async function removeFromDLQ(id: string): Promise<boolean> {
  try {
    await prisma.deadLetterQueue.delete({ where: { id } });
    logger.info('dlq.entry_removed', { id });
    return true;
  } catch {
    return false;
  }
}

/**
 * Purge old DLQ entries (older than specified days).
 */
export async function purgeOldDLQEntries(daysOld: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await prisma.deadLetterQueue.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  logger.info('dlq.purge', { count: result.count, daysOld });
  return result.count;
}

/**
 * Get DLQ summary statistics.
 */
export async function getDLQSummary(): Promise<{
  total: number;
  byEntityType: Record<string, number>;
  exhausted: number;
  retriable: number;
}> {
  const total = await getDLQCount();

  const byType = await prisma.deadLetterQueue.groupBy({
    by: ['entityType'],
    _count: true,
  });

  const allEntries = await prisma.deadLetterQueue.findMany({
    select: { retryCount: true, maxRetries: true },
  });

  const exhausted = allEntries.filter(e => e.retryCount >= e.maxRetries).length;
  const retriable = allEntries.filter(e => e.retryCount < e.maxRetries).length;

  return {
    total,
    byEntityType: Object.fromEntries(byType.map(t => [t.entityType, t._count])),
    exhausted,
    retriable,
  };
}
