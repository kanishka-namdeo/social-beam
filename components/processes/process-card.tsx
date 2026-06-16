"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  typeIconMap,
  typeLabelMap,
  statusColorMap,
  statusLabelMap,
  relativeTime,
  formatDuration,
} from "@/lib/activity-utils";
import { cn } from "@/lib/utils";
import { X } from "@phosphor-icons/react";
import type { ScraperProcess } from "./types";
import { CANCELABLE_STATUSES, ACTIVE_STATUSES } from "./types";
import { useProcessStream } from "./use-process-stream";

interface ProcessCardProps {
  process: ScraperProcess;
  onCancel: (processId: string) => Promise<void>;
}

export function ProcessCard({ process, onCancel }: ProcessCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isActive = ACTIVE_STATUSES.includes(process.status);
  const canCancel = CANCELABLE_STATUSES.includes(process.status);

  const stream = useProcessStream(isActive ? process.id : null);

  const displayProgress = isActive ? stream.progress : process.progress;
  const displayStatus = isActive && stream.status ? stream.status : process.status;
  const displayStep = isActive ? stream.currentStep : process.currentStep;

  const TypeIcon = typeIconMap[process.type];
  const statusColor = statusColorMap[displayStatus];
  const statusLabel = statusLabelMap[displayStatus];

  const progressColor =
    displayStatus === "RUNNING"
      ? "bg-blue-500"
      : displayStatus === "COMPLETED"
        ? "bg-green-500"
        : displayStatus === "FAILED"
          ? "bg-red-500"
          : "bg-gray-400";

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel(process.id);
      setShowCancelDialog(false);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {TypeIcon && <TypeIcon className="h-5 w-5 text-muted-foreground" />}
              <div className="font-semibold leading-none tracking-tight">
                {typeLabelMap[process.type]}
              </div>
            </div>
            <Badge variant="secondary" className={cn("gap-1", statusColor)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium tabular-nums">{Math.round(displayProgress)}%</span>
            </div>
            <Progress value={displayProgress} className="h-2" indicatorColor={progressColor} />
          </div>

          {displayStep && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Step:</span> {displayStep}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Started</span>
            <span className="font-medium">
              {process.startedAt ? (
                displayStatus === "RUNNING" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    In progress
                  </span>
                ) : (
                  relativeTime(process.startedAt)
                )
              ) : (
                "—"
              )}
            </span>
          </div>

          {process.startedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium tabular-nums">
                {formatDuration(process.startedAt, process.finishedAt)}
              </span>
            </div>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowCancelDialog(true)}
              disabled={isCancelling}
            >
              <X className="h-4 w-4" />
              Cancel Process
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this {typeLabelMap[process.type].toLowerCase()}{" "}
              process? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Running
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
