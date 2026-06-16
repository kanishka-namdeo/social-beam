"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Brain,
  ChartBar,
  CheckCircle,
  Clock,
  Info,
  LinkedinLogo,
  PaperPlaneTilt,
  RedditLogo,
  Sparkle,
  Spinner,
  Wrench,
  XCircle,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ActivityType =
  | "REDDIT_SCRAPING"
  | "BRAND_LEARNING"
  | "SCRAPER_HEALER"
  | "PUBLISH_QUEUE"
  | "ANALYTICS_SYNC"
  | "BRAND_ANALYSIS"
  | "LINKEDIN_IMPORT";

type ActivityStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface UnifiedActivityEntry {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  startedAt: string;
  finishedAt?: string;
  // Process data (if available)
  progress?: number;
  currentStep?: string;
  postsFound?: number;
  postsProcessed?: number;
  processId?: string;
  hasLiveLogs?: boolean;
  canCancel?: boolean;
}

interface UnifiedActivityResponse {
  active: UnifiedActivityEntry[];
  recent: UnifiedActivityEntry[];
}

const POLL_INTERVAL_MS = 10_000;

const typeIconMap: Record<ActivityType, typeof Clock> = {
  REDDIT_SCRAPING: RedditLogo,
  BRAND_LEARNING: Sparkle,
  SCRAPER_HEALER: Wrench,
  PUBLISH_QUEUE: PaperPlaneTilt,
  ANALYTICS_SYNC: ChartBar,
  BRAND_ANALYSIS: Brain,
  LINKEDIN_IMPORT: LinkedinLogo,
};

const typeLabelMap: Record<ActivityType, string> = {
  REDDIT_SCRAPING: "Reddit Scraping",
  BRAND_LEARNING: "Brand Learning",
  SCRAPER_HEALER: "Scraper Health Check",
  PUBLISH_QUEUE: "Post Publishing",
  ANALYTICS_SYNC: "Analytics Sync",
  BRAND_ANALYSIS: "Brand Analysis",
  LINKEDIN_IMPORT: "LinkedIn Import",
};

function statusIcon(status: ActivityStatus) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="size-4 text-success" weight="fill" />;
    case "FAILED":
      return <XCircle className="size-4 text-destructive" weight="fill" />;
    default:
      return <Info className="size-4 text-muted-foreground" />;
  }
}

function relativeTime(date: Date, now: number) {
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function fetchActivity(): Promise<{ active: UnifiedActivityEntry[]; recent: UnifiedActivityEntry[] }> {
  const res = await fetch("/api/activity/logs?include=process");

  if (!res.ok) throw new Error("Failed to fetch activity");

  const data = await res.json() as UnifiedActivityResponse;

  return {
    active: data.active,
    recent: data.recent,
  };
}

async function cancelActivity(activityId: string): Promise<void> {
  await fetch(`/api/activity/logs/${activityId}/cancel`, { method: "POST" });
}

export function ActivityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<UnifiedActivityEntry[]>([]);
  const [recent, setRecent] = useState<UnifiedActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const poll = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const data = await fetchActivity();
      setActive(data.active);
      setRecent(data.recent);
    } catch {
      // Silently ignore — next poll will retry
    } finally {
      setLoading(false);
    }
  }, []);

  // Visibility pause/resume
  useEffect(() => {
    const handler = () => {
      pausedRef.current = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Polling interval
  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  // Refresh relative times every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const clearCompleted = () => {
    setRecent((prev) => prev.filter((e) => e.status === "RUNNING"));
  };

  const hasActive = active.length > 0;
  const isEmpty = !hasActive && recent.length === 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "relative transition-all duration-[var(--duration-medium)] ease-[var(--ease-decelerate)] active:scale-[0.98] hover-scale",
          )}
          aria-label="Activity"
          title="Activity"
        >
          <Clock className="size-5" />
          {hasActive && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-sm bg-brand animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 animate-[scale-in_150ms_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-body font-semibold text-foreground">Activity</h3>
          {loading && (
            <Spinner className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {isEmpty ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto mb-2 size-8 text-muted-foreground animate-[pulse_2s_ease-in-out_infinite]" weight="light" />
            <p className="text-caption text-muted-foreground">No activity — all systems idle</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {hasActive && (
              <div>
                <DropdownMenuLabel>Active Tasks</DropdownMenuLabel>
                <div className="divide-y divide-border">
                  {active.map((entry) => {
                    const Icon = typeIconMap[entry.type];
                    const startedAt = entry.startedAt ?? "";
                    return (
                      <div key={entry.id} className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Spinner className="size-4 animate-spin text-brand" />
                          <Icon className="size-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-body text-foreground truncate">
                            {typeLabelMap[entry.type]}
                          </span>
                          <button
                            onClick={() => cancelActivity(entry.id)}
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Cancel task"
                          >
                            <X className="size-3.5" weight="bold" />
                          </button>
                        </div>
                        {(entry.progress ?? 0) > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand transition-all duration-300"
                                style={{ width: `${Math.min(entry.progress ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-micro text-muted-foreground shrink-0 tabular-nums">
                              {Math.round(entry.progress ?? 0)}%
                            </span>
                          </div>
                        )}
                        {entry.currentStep && (
                          <p className="mt-1 text-micro text-muted-foreground truncate">
                            {entry.currentStep}
                          </p>
                        )}
                        {startedAt && (
                          <p className="mt-1 text-micro text-muted-foreground">
                            {relativeTime(new Date(startedAt), now)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasActive && recent.length > 0 && (
              <DropdownMenuSeparator />
            )}

            {recent.length > 0 && (
              <div>
                <DropdownMenuLabel>Recent Activity</DropdownMenuLabel>
                <div className="divide-y divide-border">
                  {recent.map((entry) => {
                    const Icon = typeIconMap[entry.type] ?? Clock;
                    return (
                      <div key={entry.id} className="flex items-center gap-2.5 px-4 py-3">
                        {statusIcon(entry.status)}
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-body text-foreground truncate">
                          {typeLabelMap[entry.type]}
                        </span>
                        <span className="text-micro text-muted-foreground shrink-0">
                          {relativeTime(
                            new Date(entry.finishedAt ?? entry.startedAt),
                            now,
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border px-4 py-2 flex items-center justify-end gap-2">
          {recent.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-7 px-2 text-caption text-muted-foreground hover:text-foreground"
            >
              Clear completed
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
            onClick={() => setIsOpen(false)}
            className="h-7 px-2 text-caption text-muted-foreground hover:text-foreground ml-auto"
          >
            <Link href="/activity">View all activity</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
