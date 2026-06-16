"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

interface LogViewerProps {
  jobId: string;
  className?: string;
}

export function LogViewer({ jobId, className }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/sync/logs?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        setLogs((prev) => {
          const next = [...prev, entry];
          // Cap at 500 logs to prevent unbounded growth
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
      } catch (err) {
        console.error("[LogViewer] Failed to parse log entry:", err);
      }
    };

    eventSource.addEventListener('done', () => {
      eventSource.close();
    });

    eventSource.onerror = () => {
      console.error("[LogViewer] EventSource connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Live Logs</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "text-xs rounded px-2 py-1",
            autoScroll ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
        </button>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-muted/30 p-3 font-mono text-xs space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground italic">Waiting for logs...</div>
        ) : (
          logs.map((entry, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                entry.level === 'error' && "text-destructive",
                entry.level === 'warn' && "text-yellow-600 dark:text-yellow-400",
                entry.level === 'debug' && "text-muted-foreground"
              )}
            >
              <span className="text-muted-foreground shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="uppercase shrink-0 w-12">[{entry.level}]</span>
              <span className="flex-1">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
