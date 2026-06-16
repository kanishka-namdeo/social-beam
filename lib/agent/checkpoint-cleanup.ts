import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/** Default TTLs per agent type in days */
export const AGENT_TTLS: Record<string, number> = {
  onboarding: 7,
  'brand-analyzer': 30,
  'self-healer': 14,
};

const GLOBAL_DEFAULT_TTL_DAYS = 30;

/**
 * Extract a Unix millisecond timestamp from a UUID v1 (time-based).
 * Returns null if the ID is not a valid v1 UUID.
 */
function uuidV1ToTimestamp(uuid: string): number | null {
  try {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) return null;

    const timeHiHex = hex.slice(12, 16);
    const timeHi = parseInt(timeHiHex, 16);
    const version = (timeHi & 0xf000) >> 12;
    if (version !== 1) return null;

    const timeLow = parseInt(hex.slice(0, 8), 16);
    const timeMid = parseInt(hex.slice(8, 12), 16);
    const timeHiAndVersion = timeHi & 0x0fff;

    const timestamp100ns =
      timeLow +
      timeMid * 0x100000000 +
      timeHiAndVersion * 0x1000000000000;

    const GREGORIAN_OFFSET_MS = 12219292800000;
    return timestamp100ns / 10000 - GREGORIAN_OFFSET_MS;
  } catch {
    return null;
  }
}

/** Extract timestamp from checkpoint metadata JSON */
function extractMetadataTimestamp(metadata: unknown): number | null {
  try {
    if (!metadata || typeof metadata !== 'object') return null;
    const meta = metadata as Record<string, unknown>;

    if (typeof meta.timestamp === 'string') {
      const ts = new Date(meta.timestamp as string).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (typeof meta.created_at === 'string') {
      const ts = new Date(meta.created_at as string).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (typeof meta.createdAt === 'string') {
      const ts = new Date(meta.createdAt as string).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (typeof meta.timestamp === 'number') return meta.timestamp as number;
    if (typeof meta.created_at === 'number') return meta.created_at as number;
  } catch {
    // ignore parse errors
  }
  return null;
}

/** Get the best available timestamp for a checkpoint row */
function getCheckpointTimestamp(row: {
  checkpoint_id: string;
  metadata: unknown;
}): number | null {
  const metaTs = extractMetadataTimestamp(row.metadata);
  if (metaTs) return metaTs;
  return uuidV1ToTimestamp(row.checkpoint_id);
}

/** Resolve TTL for a given agent type */
function getTTLForAgent(agentType: string | null): number {
  if (agentType && AGENT_TTLS[agentType] !== undefined) {
    return AGENT_TTLS[agentType];
  }
  return GLOBAL_DEFAULT_TTL_DAYS;
}

/**
 * Extract the agent type from checkpoint metadata.
 * Looks for common keys: agent_type, agentType, graph_id, name.
 */
function extractAgentType(metadata: unknown): string | null {
  try {
    if (!metadata || typeof metadata !== 'object') return null;
    const meta = metadata as Record<string, unknown>;
    for (const key of ['agent_type', 'agentType', 'graph_id', 'graphId', 'name']) {
      if (typeof meta[key] === 'string') return meta[key] as string;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Purge checkpoints older than the configured TTL for each agent type.
 * Uses raw SQL because the checkpoints table is managed by LangGraph
 * and not mapped through Prisma's generated client.
 *
 * @param maxAgeDays - Optional global default TTL override (days). When provided,
 *   overrides the per-agent or global default for any agent type that does not
 *   have an explicit entry in AGENT_TTLS.
 */
export async function purgeExpiredCheckpoints(
  maxAgeDays?: number,
): Promise<{ deleted: number; byAgent: Record<string, number> }> {
  const log = logger.child({ module: 'checkpoint-cleanup' });
  let totalDeleted = 0;
  const byAgent: Record<string, number> = {};

  // Fetch all checkpoints with their metadata and IDs
  const rows: Array<{
    thread_id: string;
    checkpoint_ns: string;
    checkpoint_id: string;
    metadata: unknown;
  }> = await prisma.$queryRawUnsafe(
    `SELECT thread_id, checkpoint_ns, checkpoint_id, metadata FROM checkpoints`,
  );

  log.info('checkpoint.cleanup.start', { totalCheckpoints: rows.length, maxAgeDaysOverride: maxAgeDays });

  const now = Date.now();
  const toDelete = new Map<string, string>(); // key -> agentType for per-agent counting

  for (const row of rows) {
    const agentType = extractAgentType(row.metadata);
    const ttlDays = maxAgeDays ?? getTTLForAgent(agentType);
    const ts = getCheckpointTimestamp(row);

    if (!ts) {
      continue;
    }

    const ageMs = now - ts;
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

    if (ageMs > ttlMs) {
      const key = `${row.thread_id}|||${row.checkpoint_ns}|||${row.checkpoint_id}`;
      toDelete.set(key, agentType ?? 'unknown');
    }
  }

  if (toDelete.size === 0) {
    log.info('checkpoint.cleanup.none_expired');
    return { deleted: 0, byAgent: {} };
  }

  // Count per-agent before deletion
  for (const agentType of toDelete.values()) {
    byAgent[agentType] = (byAgent[agentType] ?? 0) + 1;
  }

  // Delete in batches to avoid overly large IN clauses
  const keys = Array.from(toDelete.keys());
  const BATCH_SIZE = 500;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);

    // Delete dependent rows first (checkpoint_blobs, checkpoint_writes)
    for (const key of batch) {
      const [thread_id, checkpoint_ns, checkpoint_id] = key.split('|||');
      await prisma.$executeRawUnsafe(
        `DELETE FROM checkpoint_writes WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
        thread_id,
        checkpoint_ns,
        checkpoint_id,
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM checkpoint_blobs WHERE thread_id = $1 AND checkpoint_ns = $2`,
        thread_id,
        checkpoint_ns,
      );
    }

    let batchDeleted = 0;
    for (const key of batch) {
      const [thread_id, checkpoint_ns, checkpoint_id] = key.split('|||');
      const result: Array<{ deleted: bigint }> = await prisma.$queryRawUnsafe(
        `WITH deleted AS (DELETE FROM checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3 RETURNING checkpoint_id) SELECT COUNT(*)::bigint as deleted FROM deleted`,
        thread_id,
        checkpoint_ns,
        checkpoint_id,
      );
      batchDeleted += Number(result[0]?.deleted ?? 0);
    }
    totalDeleted += batchDeleted;
  }

  log.info('checkpoint.cleanup.complete', {
    deleted: totalDeleted,
    scanned: rows.length,
    byAgent,
  });

  return { deleted: totalDeleted, byAgent };
}
