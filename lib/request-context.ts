import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function withContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContextStorage.run(ctx, fn);
}
