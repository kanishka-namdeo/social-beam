"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  typeLabelMap,
  typeIconMap,
  statusLabelMap,
  statusColorMap,
  formatDateTime,
  formatDuration,
  type ActivityLog,
} from "@/lib/activity-utils";

interface ActivityDetailsModalProps {
  log: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailsModal({
  log,
  open,
  onOpenChange,
}: ActivityDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  if (!log) return null;

  const TypeIcon = typeIconMap[log.type];
  const statusColor = statusColorMap[log.status];

  const copyToClipboard = async () => {
    const text = JSON.stringify(log.details, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-full bg-muted">
              <TypeIcon className="size-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">
                {typeLabelMap[log.type]}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`size-2 rounded-full ${statusColor}`} />
                <span className="text-sm text-muted-foreground">
                  {statusLabelMap[log.status]}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Started</div>
              <div className="text-sm font-medium">
                {formatDateTime(log.startedAt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Finished</div>
              <div className="text-sm font-medium">
                {log.finishedAt ? formatDateTime(log.finishedAt) : "—"}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Duration</div>
              <div className="text-sm font-medium">
                {log.status === "RUNNING" ? (
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    In progress
                  </span>
                ) : (
                  formatDuration(log.startedAt, log.finishedAt)
                )}
              </div>
            </div>
          </div>

          {/* Details JSON Section */}
          {log.details && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Details</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-7 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-xs font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
