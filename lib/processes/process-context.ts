import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { processLogStore, type LogEntry } from './process-log-store';

export interface ProcessContext {
  signal: AbortSignal;
  processId: string;
  workspaceId: string;
  reportProgress(percentage: number, stepDescription?: string): Promise<void>;
  reportPostsFound(count: number): Promise<void>;
  reportPostsProcessed(count: number): Promise<void>;
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: Record<string, unknown>): void;
  throwIfCancelled(): void;
  destroy(): void;
}

const PROGRESS_DEBOUNCE_MS = 500;
const COUNTER_DEBOUNCE_MS = 500;

interface PendingProgress {
  percentage: number;
  stepDescription?: string;
}

interface PendingCounters {
  postsFound?: number;
  postsProcessed?: number;
}

export function createProcessContext(
  processId: string,
  workspaceId: string,
  signal: AbortSignal,
): ProcessContext {
  // In-memory state for immediate reads
  let currentProgress = 0;
  let currentStep: string | undefined;
  let postsFound = 0;
  let postsProcessed = 0;

  // Debounce timers
  let progressTimer: NodeJS.Timeout | null = null;
  let pendingProgress: PendingProgress | null = null;
  let counterTimer: NodeJS.Timeout | null = null;
  let pendingCounters: PendingCounters = {};

  const flushProgress = async (): Promise<void> => {
    if (!pendingProgress) return;
    const { percentage, stepDescription } = pendingProgress;
    pendingProgress = null;
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }
    try {
      await prisma.scraperProcess.update({
        where: { id: processId },
        data: { progress: percentage, currentStep: stepDescription },
      });
    } catch (err) {
      logger.warn('Failed to flush progress to DB', { processId, error: String(err) });
    }
  };

  const flushCounters = async (): Promise<void> => {
    if (pendingCounters.postsFound === undefined && pendingCounters.postsProcessed === undefined) return;
    const data: Record<string, number> = {};
    if (pendingCounters.postsFound !== undefined) data.postsFound = pendingCounters.postsFound;
    if (pendingCounters.postsProcessed !== undefined) data.postsProcessed = pendingCounters.postsProcessed;
    pendingCounters = {};
    if (counterTimer) {
      clearTimeout(counterTimer);
      counterTimer = null;
    }
    try {
      await prisma.scraperProcess.update({
        where: { id: processId },
        data,
      });
    } catch (err) {
      logger.warn('Failed to flush counters to DB', { processId, error: String(err) });
    }
  };

  const scheduleProgressFlush = (progress: PendingProgress): void => {
    pendingProgress = progress;
    if (!progressTimer) {
      progressTimer = setTimeout(() => {
        void flushProgress();
      }, PROGRESS_DEBOUNCE_MS);
    }
  };

  const scheduleCounterFlush = (counters: PendingCounters): void => {
    if (counters.postsFound !== undefined) pendingCounters.postsFound = counters.postsFound;
    if (counters.postsProcessed !== undefined) pendingCounters.postsProcessed = counters.postsProcessed;
    if (!counterTimer) {
      counterTimer = setTimeout(() => {
        void flushCounters();
      }, COUNTER_DEBOUNCE_MS);
    }
  };

  const ctx: ProcessContext = {
    signal,
    processId,
    workspaceId,

    async reportProgress(percentage: number, stepDescription?: string): Promise<void> {
      currentProgress = percentage;
      currentStep = stepDescription;
      scheduleProgressFlush({ percentage, stepDescription });
    },

    async reportPostsFound(count: number): Promise<void> {
      postsFound = count;
      scheduleCounterFlush({ postsFound: count });
    },

    async reportPostsProcessed(count: number): Promise<void> {
      postsProcessed = count;
      scheduleCounterFlush({ postsProcessed: count });
    },

    log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: Record<string, unknown>): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      };
      processLogStore.append(processId, entry);

      // Also forward to the main logger
      const logData = { processId, workspaceId, ...data };
      switch (level) {
        case 'error':
          logger.error(message, logData);
          break;
        case 'warn':
          logger.warn(message, logData);
          break;
        case 'debug':
          logger.debug(message, logData);
          break;
        default:
          logger.info(message, logData);
          break;
      }
    },

    throwIfCancelled(): void {
      if (signal.aborted) {
        const error = new DOMException('Process cancelled', 'AbortError');
        throw error;
      }
    },

    destroy(): void {
      // Flush any pending debounced writes synchronously before clearing timers.
      // The timers are cleared first to prevent them from firing after destroy,
      // then we fire-and-forget the final flush so no data is lost.
      const finalProgress = pendingProgress;
      const finalCounters = { ...pendingCounters };

      if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = null;
      }
      if (counterTimer) {
        clearTimeout(counterTimer);
        counterTimer = null;
      }
      pendingProgress = null;
      pendingCounters = {};
      processLogStore.clear(processId);

      // Best-effort final flush of any data not yet written to DB
      if (finalProgress) {
        prisma.scraperProcess.update({
          where: { id: processId },
          data: { progress: finalProgress.percentage, currentStep: finalProgress.stepDescription },
        }).catch(() => {});
      }
      if (finalCounters.postsFound !== undefined || finalCounters.postsProcessed !== undefined) {
        const data: Record<string, number> = {};
        if (finalCounters.postsFound !== undefined) data.postsFound = finalCounters.postsFound;
        if (finalCounters.postsProcessed !== undefined) data.postsProcessed = finalCounters.postsProcessed;
        prisma.scraperProcess.update({
          where: { id: processId },
          data,
        }).catch(() => {});
      }
    },
  };

  return ctx;
}
