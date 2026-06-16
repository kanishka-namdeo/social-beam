"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ScraperProcess } from "./types";
import { ACTIVE_STATUSES } from "./types";

const POLL_INTERVAL = 5000;

interface UseProcessListResult {
  activeProcesses: ScraperProcess[];
  recentProcesses: ScraperProcess[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cancelProcess: (processId: string) => Promise<void>;
}

export function useProcessList(): UseProcessListResult {
  const [activeProcesses, setActiveProcesses] = useState<ScraperProcess[]>([]);
  const [recentProcesses, setRecentProcesses] = useState<ScraperProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch("/api/processes");
      if (!res.ok) throw new Error(`Failed to fetch processes (${res.status})`);
      const data = await res.json();
      const processes: ScraperProcess[] = data.processes ?? [];

      setActiveProcesses(
        processes.filter((p) => ACTIVE_STATUSES.includes(p.status))
      );
      setRecentProcesses(
        processes.filter((p) => !ACTIVE_STATUSES.includes(p.status))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchProcesses();
  }, [fetchProcesses]);

  const cancelProcess = useCallback(async (processId: string) => {
    try {
      const res = await fetch(`/api/processes/${processId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to cancel process (${res.status})`);
      await fetchProcesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    }
  }, [fetchProcesses]);

  useEffect(() => {
    fetchProcesses();
    intervalRef.current = setInterval(fetchProcesses, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProcesses]);

  return {
    activeProcesses,
    recentProcesses,
    isLoading,
    error,
    refresh,
    cancelProcess,
  };
}
