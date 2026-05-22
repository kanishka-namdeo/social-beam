import { logger as baseLogger, type AppLogger } from '@/lib/logger';

export interface LogContext {
  correlationId: string;
  userId: string;
  [key: string]: unknown;
}

export function createLogger(context: LogContext): AppLogger {
  return baseLogger.child({ correlationId: context.correlationId, userId: context.userId });
}
