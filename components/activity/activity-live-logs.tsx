"use client";

import { useEffect, useRef } from "react";
import { Info, Warning, Bug } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProcessLogEntry } from "@/components/processes/types";

interface ActivityLiveLogsProps {
  logs: ProcessLogEntry[];
  isConnected: boolean;
}

const LOG_LEVEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warn: Warning,
  error: Warning,
  debug: Bug,
};

const LOG_LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  debug: "text-gray-500 dark:text-gray-400",
};

export function ActivityLiveLogs({ logs, isConnected }: ActivityLiveLogsProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-sm font-medium">Live Logs</div>
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            Connected
          </div>
        )}
      </div>
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto rounded border bg-muted/50 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
            {isConnected ? "Waiting for logs..." : "No logs available"}
          </div>
        ) : (
          <div className="space-y-0 p-2">
            {logs.map((entry, i) => {
              const LevelIcon = LOG_LEVEL_ICONS[entry.level] ?? Info;
              const levelColor = LOG_LEVEL_COLORS[entry.level] ?? LOG_LEVEL_COLORS.info;
              const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <div key={i} className="flex items-start gap-2 py-0.5 leading-relaxed">
                  <span className="shrink-0 text-muted-foreground tabular-nums">{time}</span>
                  <LevelIcon className={cn("mt-0.5 h-3 w-3 shrink-0", levelColor)} />
                  <span className="break-all">{entry.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
