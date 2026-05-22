import pino from 'pino';
import { getContext } from './request-context';

export interface AppLogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  fatal(msg: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): AppLogger;
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
    : undefined,
  base: { env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});

function makeAppLogger(pinoChild: pino.Logger): AppLogger {
  return {
    info: (msg, data) => pinoChild.child(data ?? {}).info(msg),
    warn: (msg, data) => pinoChild.child(data ?? {}).warn(msg),
    error: (msg, data) => pinoChild.child(data ?? {}).error(msg),
    debug: (msg, data) => pinoChild.child(data ?? {}).debug(msg),
    fatal: (msg, data) => pinoChild.child(data ?? {}).fatal(msg),
    child: (bindings) => makeAppLogger(pinoChild.child(bindings)),
  };
}

function childLogger(bindings: Record<string, unknown>): AppLogger {
  const ctx = getContext();
  return makeAppLogger(baseLogger.child({ ...(ctx ?? {}), ...bindings }));
}

export const logger: AppLogger = {
  info: (msg, data) => childLogger(data ?? {}).info(msg),
  warn: (msg, data) => childLogger(data ?? {}).warn(msg),
  error: (msg, data) => childLogger(data ?? {}).error(msg),
  debug: (msg, data) => childLogger(data ?? {}).debug(msg),
  fatal: (msg, data) => childLogger(data ?? {}).fatal(msg),
  child: (bindings) => childLogger(bindings),
};
