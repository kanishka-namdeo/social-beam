import { PrismaClient } from '@/app/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.pool = pool;
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Close the database pool on process exit to prevent memory leaks.
 * Important for serverless/edge environments and during hot reloads.
 */
export async function closePool(): Promise<void> {
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end();
    globalForPrisma.pool = undefined;
    globalForPrisma.prisma = undefined;
  }
}

// Register cleanup handlers for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', closePool);
  process.on('SIGTERM', async () => {
    await closePool();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await closePool();
    process.exit(0);
  });
}

export default prisma;
