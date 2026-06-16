"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowClockwise } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

interface SyncButtonProps {
  platform: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onComplete?: () => void;
  onViewLogs?: (jobId: string) => void;
}

interface SyncJobStatus {
  phase: string;
  progress: number;
  message: string;
  postsFound?: number;
  postsStored?: number;
}

const phaseLabels: Record<string, string> = {
  preparing: "Preparing",
  scraping: "Syncing",
  storing: "Saving",
  done: "Done",
  error: "Error",
};

export function SyncButton({
  platform,
  label,
  variant = "outline",
  size = "sm",
  className,
  onComplete,
  onViewLogs,
}: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const pollForStatus = useCallback(
    async (jobId: string, maxPolls = 60) => {
      let polls = 0;
      const poll = async () => {
        polls++;
        if (polls > maxPolls) {
          if (pollRef.current) clearTimeout(pollRef.current);
          if (!mountedRef.current) return;
          setSyncing(false);
          return;
        }

        // Abort previous poll request before starting new one
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const res = await fetch(`/api/sync/status?jobId=${jobId}`, {
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (res.ok) {
            const json = await res.json();
            const status: SyncJobStatus = json.data;
            if (!mountedRef.current) return;
            setProgress(status.progress);
            setPhase(status.phase);

            if (status.phase === "done" || status.phase === "error") {
              if (pollRef.current) clearTimeout(pollRef.current);
              if (!mountedRef.current) return;
              setSyncing(false);
              if (status.phase === "done") {
                toast.success(status.message || "Sync complete!");
                onComplete?.();
              } else {
                toast.error(status.message || "Sync failed");
              }
              return;
            }
          }
        } catch (err) {
          // AbortError is expected on cleanup, ignore it
          if (abortControllerRef.current?.signal.aborted) return;
          // Silently continue polling for other errors
        }

        if (!mountedRef.current) return;
        pollRef.current = setTimeout(poll, 3000);
      };

      pollRef.current = setTimeout(poll, 2000);
    },
    [onComplete],
  );

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);
    setPhase("preparing");
    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = await res.json();
      if (res.ok && json.jobId) {
        setJobId(json.jobId);
        toast.success(json.message || "Sync started");
        void pollForStatus(json.jobId);
      } else {
        toast.error(json.error || "Failed to start sync");
        setSyncing(false);
      }
    } catch {
      toast.error("Failed to start sync");
      setSyncing(false);
    }
  };

  const displayLabel = syncing
    ? `${phaseLabels[phase] || "Syncing"}... ${progress}%`
    : label || "Sync Now";

  return (
    <div className="flex flex-col">
      <Button
        variant={variant}
        size={size}
        onClick={handleSync}
        disabled={syncing}
        className={className ?? "gap-1.5"}
      >
        <ArrowClockwise
          className={`size-4 ${syncing ? "animate-spin" : ""}`}
          weight="bold"
        />
        {displayLabel}
      </Button>
      {jobId && onViewLogs && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewLogs(jobId)}
          className="w-full mt-1"
        >
          View Logs
        </Button>
      )}
    </div>
  );
}
