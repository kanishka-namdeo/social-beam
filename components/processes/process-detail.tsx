"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  typeIconMap,
  typeLabelMap,
  statusColorMap,
  statusLabelMap,
  relativeTime,
  formatDuration,
  formatDateTime,
} from "@/lib/activity-utils";
import { cn } from "@/lib/utils";
import {
  Copy,
  X,
  CheckCircle,
  Warning,
  Info,
  Bug,
} from "@phosphor-icons/react";
import type { ScraperProcess, ProcessLogEntry } from "./types";
import { CANCELABLE_STATUSES } from "./types";
import { useProcessStream } from "./use-process-stream";

interface ProcessDetailProps {
  processId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (processId: string) => Promise<void>;
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

export function ProcessDetail({
  processId,
  open,
  onOpenChange,
  onCancel,
}: ProcessDetailProps) {
  const [process, setProcess] = useState<ScraperProcess | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const stream = useProcessStream(processId);

  useEffect(() => {
    if (!processId || !open) {
      setProcess(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/processes/${processId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) setProcess(data.process);
      })
      .catch(() => {
        // ignore — AbortError is expected on cleanup
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [processId, open]);

  useEffect(() => {
    const el = logContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [stream.logs]);

  const handleCancel = useCallback(async () => {
    if (!processId || !onCancel) return;
    setIsCancelling(true);
    try {
      await onCancel(processId);
    } finally {
      setIsCancelling(false);
    }
  }, [processId, onCancel]);

  const handleCopyDetails = useCallback(() => {
    if (!process) return;
    const details = [
      `ID: ${process.id}`,
      `Type: ${typeLabelMap[process.type]}`,
      `Status: ${statusLabelMap[process.status]}`,
      `Progress: ${process.progress}%`,
      process.currentStep ? `Current Step: ${process.currentStep}` : null,
      `Posts Found: ${process.postsFound}`,
      `Posts Processed: ${process.postsProcessed}`,
      process.error ? `Error: ${process.error}` : null,
      process.startedAt ? `Started: ${formatDateTime(process.startedAt)}` : null,
      process.finishedAt ? `Finished: ${formatDateTime(process.finishedAt)}` : null,
      process.startedAt
        ? `Duration: ${formatDuration(process.startedAt, process.finishedAt)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(details);
  }, [process]);

  const displayProcess = process;
  const TypeIcon = displayProcess ? typeIconMap[displayProcess.type] : null;
  const canCancel = displayProcess
    ? CANCELABLE_STATUSES.includes(displayProcess.status)
    : false;

  const effectiveProgress = stream.progress || displayProcess?.progress || 0;
  const effectiveStatus = stream.status || displayProcess?.status || null;
  const effectiveStep = stream.currentStep ?? displayProcess?.currentStep;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {TypeIcon && <TypeIcon className="h-5 w-5 text-muted-foreground" />}
            Process Details
          </SheetTitle>
          <SheetDescription>
            {displayProcess
              ? `${typeLabelMap[displayProcess.type]} — ${displayProcess.id.slice(0, 8)}`
              : isLoading
                ? "Loading..."
                : "No process selected"}
          </SheetDescription>
        </SheetHeader>

        {displayProcess && (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {effectiveStatus && (
                  <Badge
                    variant="secondary"
                    className={cn("gap-1", statusColorMap[effectiveStatus])}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabelMap[effectiveStatus]}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">
                    {Math.round(effectiveProgress)}%
                  </span>
                </div>
                <Progress
                  value={effectiveProgress}
                  className="h-2"
                  indicatorColor={
                    effectiveStatus === "RUNNING"
                      ? undefined
                      : effectiveStatus === "COMPLETED"
                        ? "bg-green-500"
                        : effectiveStatus === "FAILED"
                          ? "bg-red-500"
                          : "bg-gray-400"
                  }
                />
              </div>

              {effectiveStep && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Current Step:</span>{" "}
                  <span className="font-medium">{effectiveStep}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Posts Found</span>
                  <div className="font-medium tabular-nums">
                    {displayProcess.postsFound}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Posts Processed</span>
                  <div className="font-medium tabular-nums">
                    {displayProcess.postsProcessed}
                  </div>
                </div>
              </div>

              {displayProcess.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">
                    {formatDateTime(displayProcess.startedAt)}
                  </span>
                </div>
              )}

              {displayProcess.finishedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Finished</span>
                  <span className="font-medium">
                    {formatDateTime(displayProcess.finishedAt)}
                  </span>
                </div>
              )}

              {displayProcess.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium tabular-nums">
                    {formatDuration(
                      displayProcess.startedAt,
                      displayProcess.finishedAt
                    )}
                  </span>
                </div>
              )}

              {displayProcess.error && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
                  <div className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
                    <Warning className="h-4 w-4" />
                    Error
                  </div>
                  <div className="mt-1 text-red-600 dark:text-red-300">
                    {displayProcess.error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canCancel && onCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  <X className="h-4 w-4" />
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopyDetails}
              >
                <Copy className="h-4 w-4" />
                Copy Details
              </Button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-2 text-sm font-medium">Logs</div>
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto rounded border bg-muted/50 font-mono text-xs"
              >
                {stream.logs.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
                    {stream.isConnected
                      ? "Waiting for logs..."
                      : "No logs available"}
                  </div>
                ) : (
                  <div className="space-y-0 p-2">
                    {stream.logs.map((entry, i) => {
                      const LevelIcon =
                        LOG_LEVEL_ICONS[entry.level] ?? Info;
                      const levelColor =
                        LOG_LEVEL_COLORS[entry.level] ?? LOG_LEVEL_COLORS.info;
                      const time = new Date(entry.timestamp).toLocaleTimeString(
                        "en-US",
                        {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 py-0.5 leading-relaxed"
                        >
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {time}
                          </span>
                          <LevelIcon
                            className={cn(
                              "mt-0.5 h-3 w-3 shrink-0",
                              levelColor
                            )}
                          />
                          <span className="break-all">{entry.message}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
