import { ActivityType } from '@/app/generated/prisma';
import type { Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { processRegistry } from './process-registry';
import { createProcessContext, type ProcessContext } from './process-context';

export type { ProcessContext };

export interface RunProcessOptions {
  metadata?: Prisma.InputJsonValue;
}

export async function runProcess<T>(
  workspaceId: string,
  type: ActivityType,
  scraperFn: (ctx: ProcessContext) => Promise<T>,
  options?: RunProcessOptions
): Promise<{ processId: string }> {
  // Check if already running (duplicate prevention)
  if (processRegistry.isRunning(workspaceId, type)) {
    const error = new Error(`Process ${type} is already running for workspace ${workspaceId}`);
    (error as Error & { statusCode?: number }).statusCode = 409;
    throw error;
  }

  // Create ScraperProcess DB record with status=QUEUED
  const process = await prisma.scraperProcess.create({
    data: {
      workspaceId,
      type,
      status: 'QUEUED',
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
    },
  });

  const processId = process.id;
  let signal: AbortSignal | undefined;
  let ctx: ProcessContext | undefined;

  try {
    // Update to STARTING
    await prisma.scraperProcess.update({
      where: { id: processId },
      data: { status: 'STARTING' },
    });

    // Register in process registry to get AbortController
    const abortController = processRegistry.register(processId, workspaceId, type);
    signal = abortController.signal;

    // Create ProcessContext with debounced DB writes and log store
    ctx = createProcessContext(processId, workspaceId, signal);

    // Update to RUNNING, set startedAt
    await prisma.scraperProcess.update({
      where: { id: processId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Execute the scraper function
    await scraperFn(ctx);

    // Update to COMPLETED
    await prisma.scraperProcess.update({
      where: { id: processId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        finishedAt: new Date(),
      },
    });

    logger.info('Process completed', { processId, workspaceId, type });
  } catch (error) {
    // Determine if cancelled or failed
    const isAbortError =
      error instanceof Error && (error.name === 'AbortError' || signal?.aborted);

    const finalStatus = isAbortError ? 'CANCELLED' : 'FAILED';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.scraperProcess.update({
      where: { id: processId },
      data: {
        status: finalStatus,
        error: errorMessage,
        finishedAt: new Date(),
      },
    });

    if (isAbortError) {
      logger.info('Process cancelled', { processId, workspaceId, type });
    } else {
      logger.error('Process failed', {
        processId,
        workspaceId,
        type,
        error: errorMessage,
      });
    }
  } finally {
    // Always clean up ProcessContext (clear timers, release log buffer)
    ctx?.destroy();
    ctx = undefined;
    // Always unregister from process registry
    processRegistry.unregister(processId);
  }

  return { processId };
}

export async function recoverOrphanedProcesses(): Promise<void> {
  const orphanedProcesses = await prisma.scraperProcess.findMany({
    where: {
      status: {
        in: ['RUNNING', 'STARTING'],
      },
    },
  });

  if (orphanedProcesses.length === 0) {
    logger.info('No orphaned processes found');
    return;
  }

  logger.warn('Recovering orphaned processes', { count: orphanedProcesses.length });

  for (const proc of orphanedProcesses) {
    await prisma.scraperProcess.update({
      where: { id: proc.id },
      data: {
        status: 'ORPHANED',
        finishedAt: new Date(),
        metadata: JSON.parse(JSON.stringify({
          reason: 'server_restart',
          orphanedAt: new Date().toISOString(),
        })),
      },
    });

    logger.warn('Process marked as orphaned', {
      processId: proc.id,
      workspaceId: proc.workspaceId,
      type: proc.type,
    });
  }
}
