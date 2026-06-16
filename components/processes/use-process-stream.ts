"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProcessLogEntry, ScraperProcessStatus } from "./types";

const MAX_LOGS = 500;
const RECONNECT_DELAY = 3000;
const MAX_RETRIES = 5;

interface UseProcessStreamResult {
  progress: number;
  status: ScraperProcessStatus | null;
  currentStep: string | null;
  logs: ProcessLogEntry[];
  isConnected: boolean;
}

export function useProcessStream(processId: string | null): UseProcessStreamResult {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ScraperProcessStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [logs, setLogs] = useState<ProcessLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logsRef = useRef<ProcessLogEntry[]>([]);
  const processIdRef = useRef(processId);
  processIdRef.current = processId;

  logsRef.current = logs;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    const currentProcessId = processIdRef.current;
    if (!currentProcessId) return;
    cleanup();

    const es = new EventSource(`/api/processes/${currentProcessId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      retryCountRef.current = 0;
    };

    es.addEventListener("progress", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.progress === "number") setProgress(data.progress);
        if (data.currentStep !== undefined) setCurrentStep(data.currentStep);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("log", (event: MessageEvent) => {
      try {
        const entry: ProcessLogEntry = JSON.parse(event.data);
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
        });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("status-change", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("complete", () => {
      setStatus("COMPLETED");
      setProgress(100);
      cleanup();
    });

    es.addEventListener("error", (event: MessageEvent) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            setLogs((prev) => [
              ...prev,
              { level: "error", message: data.message, timestamp: new Date().toISOString() },
            ]);
          }
        } catch {
          // SSE connection error (not a custom event)
        }
      }
      setIsConnected(false);
      cleanup();

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (processIdRef.current) connect();
        }, RECONNECT_DELAY);
      }
    });
  }, [cleanup]);

  useEffect(() => {
    if (processId) {
      setLogs([]);
      setProgress(0);
      setStatus(null);
      setCurrentStep(null);
      retryCountRef.current = 0;
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [processId, connect, cleanup]);

  return { progress, status, currentStep, logs, isConnected };
}
