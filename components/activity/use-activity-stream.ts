"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProcessLogEntry } from "@/components/processes/types";

const MAX_LOGS = 500;
const RECONNECT_DELAY = 3000;
const MAX_RETRIES = 5;

export interface ActivityStreamState {
  progress: number;
  currentStep: string | null;
  postsFound: number;
  postsProcessed: number;
  logs: ProcessLogEntry[];
  isConnected: boolean;
  streamStatus: string | null;
}

export function useActivityStream(activityLogId: string | null) {
  const [state, setState] = useState<ActivityStreamState>({
    progress: 0,
    currentStep: null,
    postsFound: 0,
    postsProcessed: 0,
    logs: [],
    isConnected: false,
    streamStatus: null,
  });

  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityLogIdRef = useRef(activityLogId);
  activityLogIdRef.current = activityLogId;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  const connect = useCallback(() => {
    const currentLogId = activityLogIdRef.current;
    if (!currentLogId) return;
    cleanup();

    const es = new EventSource(`/api/activity/logs/${currentLogId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    es.addEventListener("progress", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          progress: typeof data.progress === "number" ? data.progress : prev.progress,
          currentStep: data.currentStep !== undefined ? data.currentStep : prev.currentStep,
          postsFound: typeof data.postsFound === "number" ? data.postsFound : prev.postsFound,
          postsProcessed: typeof data.postsProcessed === "number" ? data.postsProcessed : prev.postsProcessed,
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("log", (event: MessageEvent) => {
      try {
        const entry: ProcessLogEntry = JSON.parse(event.data);
        setState((prev) => {
          const next = [...prev.logs, entry];
          return {
            ...prev,
            logs: next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next,
          };
        });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("status-change", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          setState((prev) => ({ ...prev, streamStatus: data.status }));
        }
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("complete", () => {
      setState((prev) => ({
        ...prev,
        streamStatus: "COMPLETED",
        progress: 100,
        isConnected: false,
      }));
      cleanup();
    });

    es.addEventListener("error", (event: MessageEvent) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            setState((prev) => ({
              ...prev,
              logs: [
                ...prev.logs,
                { level: "error", message: data.message, timestamp: new Date().toISOString() },
              ],
            }));
          }
        } catch {
          // SSE connection error (not a custom event)
        }
      }
      setState((prev) => ({ ...prev, isConnected: false }));
      cleanup();

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (activityLogIdRef.current) connect();
        }, RECONNECT_DELAY);
      }
    });
  }, [cleanup]);

  useEffect(() => {
    if (activityLogId) {
      setState({
        progress: 0,
        currentStep: null,
        postsFound: 0,
        postsProcessed: 0,
        logs: [],
        isConnected: false,
        streamStatus: null,
      });
      retryCountRef.current = 0;
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [activityLogId, connect, cleanup]);

  return state;
}
