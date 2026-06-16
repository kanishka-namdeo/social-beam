import { ActivityType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface RunningProcess {
  processId: string;
  workspaceId: string;
  type: ActivityType;
  abortController: AbortController;
  startedAt: Date;
}

class ProcessRegistry {
  private processes = new Map<string, RunningProcess>();
  private static MAX_PROCESSES = 100;
  private static MAX_PROCESS_AGE_MS = 60 * 60 * 1000; // 1 hour

  /** Evict stale processes that exceeded max age. */
  private evictStaleProcesses(): void {
    const now = Date.now();
    for (const [processId, process] of this.processes) {
      if (now - process.startedAt.getTime() > ProcessRegistry.MAX_PROCESS_AGE_MS) {
        logger.warn('ProcessRegistry.stale_process_evicted', { processId });
        process.abortController.abort('evicted_due_to_age');
        this.processes.delete(processId);
      }
    }
  }

  register(
    processId: string,
    workspaceId: string,
    type: ActivityType
  ): AbortController {
    // Evict stale processes if we're at capacity
    if (this.processes.size >= ProcessRegistry.MAX_PROCESSES) {
      this.evictStaleProcesses();
    }

    const abortController = new AbortController();
    const runningProcess: RunningProcess = {
      processId,
      workspaceId,
      type,
      abortController,
      startedAt: new Date(),
    };
    this.processes.set(processId, runningProcess);
    logger.info('Process registered', { processId, workspaceId, type });
    return abortController;
  }

  unregister(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      this.processes.delete(processId);
      logger.info('Process unregistered', { processId });
    }
  }

  cancel(processId: string): boolean {
    const process = this.processes.get(processId);
    if (process) {
      process.abortController.abort();
      this.processes.delete(processId);
      logger.info('Process cancelled', { processId });
      return true;
    }
    return false;
  }

  getRunning(): RunningProcess[] {
    return Array.from(this.processes.values());
  }

  isRunning(workspaceId: string, type: ActivityType): boolean {
    return Array.from(this.processes.values()).some(
      (p) => p.workspaceId === workspaceId && p.type === type
    );
  }

  getByProcessId(processId: string): RunningProcess | undefined {
    return this.processes.get(processId);
  }
}

export const processRegistry = new ProcessRegistry();

// Graceful shutdown: mark all running processes as ORPHANED
const handleShutdown = async () => {
  const runningProcesses = processRegistry.getRunning();
  if (runningProcesses.length === 0) return;

  logger.warn('Shutdown detected, marking processes as orphaned', {
    count: runningProcesses.length,
  });

  try {
    await prisma.scraperProcess.updateMany({
      where: {
        id: { in: runningProcesses.map((p) => p.processId) },
        status: { in: ['RUNNING', 'STARTING'] },
      },
      data: {
        status: 'ORPHANED',
        finishedAt: new Date(),
        metadata: {
          reason: 'server_restart',
          orphanedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to mark processes as orphaned during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

if (!(global as any).__processRegistryHandlersRegistered) {
  (global as any).__processRegistryHandlersRegistered = true;
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}
