"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowClockwise } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

export function RefreshTrendsButton() {
  const router = useRouter();
  const [triggering, setTriggering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("scraping");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
      pollAbortRef.current?.abort();
    };
  }, []);

  const pollForJobStatus = useCallback(async (jobId: string, maxPolls = 50) => {
    let polls = 0;
    const poll = async () => {
      polls++;
      if (polls > maxPolls) {
        if (pollRef.current) clearTimeout(pollRef.current);
        if (!mountedRef.current) return;
        setTriggering(false);
        router.refresh();
        return;
      }

      // Abort previous in-flight request before starting a new one
      pollAbortRef.current?.abort();
      const controller = new AbortController();
      pollAbortRef.current = controller;

      try {
        const res = await fetch(`/api/reddit/trending/status?jobId=${jobId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const status = json.data;
          if (!mountedRef.current) return;
          setProgress(status.progress);
          setPhase(status.phase);

          if (status.phase === "done" || status.phase === "error") {
            if (pollRef.current) clearTimeout(pollRef.current);
            if (!mountedRef.current) return;
            setTriggering(false);
            router.refresh();
            if (status.phase === "done") {
              toast.success(status.message ?? "Scrape complete");
            } else {
              toast.error("Scrape encountered an error");
            }
            return;
          }
        }
      } catch {
        // Silently continue polling
      }

      if (!mountedRef.current) return;
      pollRef.current = setTimeout(poll, 3000);
    };

    pollRef.current = setTimeout(poll, 2000);
  }, [router]);

  const handleRefresh = async () => {
    setTriggering(true);
    setProgress(0);
    setPhase("scraping");
    try {
      const res = await fetch("/api/reddit/trending/trigger", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.jobId) {
        toast.success(json.data.message);
        void pollForJobStatus(json.data.jobId);
      } else {
        toast.error(json.error ?? "Failed to trigger scrape");
        setTriggering(false);
      }
    } catch {
      toast.error("Failed to trigger scrape");
      setTriggering(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={triggering}
      className="gap-1.5"
    >
      <ArrowClockwise
        className={`size-4 ${triggering ? "animate-spin" : ""}`}
        weight="bold"
      />
      {triggering ? `${phase === "scraping" ? "Scraping" : "Analyzing"}... ${progress}%` : "Refresh Trends"}
    </Button>
  );
}
