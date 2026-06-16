export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

const MAX_ENTRIES_PER_PROCESS = 500;
const MAX_PROCESS_IDS = 200;
const PROCESS_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

class ProcessLogStore {
  private buffers = new Map<string, LogEntry[]>();
  private listeners = new Map<string, Set<(entry: LogEntry) => void>>();
  private lastActivity = new Map<string, number>();

  append(processId: string, entry: LogEntry): void {
    let buffer = this.buffers.get(processId);
    if (!buffer) {
      buffer = [];
      this.buffers.set(processId, buffer);
    }

    buffer.push(entry);
    this.lastActivity.set(processId, Date.now());

    // Ring buffer: trim oldest entries when over capacity
    if (buffer.length > MAX_ENTRIES_PER_PROCESS) {
      buffer.splice(0, buffer.length - MAX_ENTRIES_PER_PROCESS);
    }

    // Evict old process IDs to prevent unbounded growth
    if (this.buffers.size > MAX_PROCESS_IDS) {
      this.evictIdleProcesses();
    }

    // Notify subscribers
    const subs = this.listeners.get(processId);
    if (subs) {
      for (const listener of subs) {
        try {
          listener(entry);
        } catch {
          // Listener errors should not break the store
        }
      }
    }
  }

  getHistory(processId: string): LogEntry[] {
    return this.buffers.get(processId) ?? [];
  }

  subscribe(processId: string, listener: (entry: LogEntry) => void): () => void {
    let subs = this.listeners.get(processId);
    if (!subs) {
      subs = new Set();
      this.listeners.set(processId, subs);
    }
    subs.add(listener);

    return () => {
      subs!.delete(listener);
      if (subs!.size === 0) {
        this.listeners.delete(processId);
      }
    };
  }

  clear(processId: string): void {
    this.buffers.delete(processId);
    this.listeners.delete(processId);
    this.lastActivity.delete(processId);
  }

  private evictIdleProcesses(): void {
    const now = Date.now();
    const idleProcessIds: string[] = [];

    for (const [processId, lastActive] of this.lastActivity) {
      if (now - lastActive > PROCESS_IDLE_TIMEOUT_MS) {
        idleProcessIds.push(processId);
      }
    }

    for (const processId of idleProcessIds) {
      this.buffers.delete(processId);
      this.listeners.delete(processId);
      this.lastActivity.delete(processId);
    }

    // If still over limit, evict oldest processes
    if (this.buffers.size > MAX_PROCESS_IDS) {
      const sortedByAge = Array.from(this.lastActivity.entries())
        .sort((a, b) => a[1] - b[1]);
      const toEvict = sortedByAge.slice(0, this.buffers.size - MAX_PROCESS_IDS);
      for (const [processId] of toEvict) {
        this.buffers.delete(processId);
        this.listeners.delete(processId);
        this.lastActivity.delete(processId);
      }
    }
  }
}

export const processLogStore = new ProcessLogStore();
