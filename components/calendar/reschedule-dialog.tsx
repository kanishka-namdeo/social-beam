"use client";

import { startTransition, useState, useCallback, useTransition, useEffect } from "react";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { Sparkle } from "@phosphor-icons/react/ssr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimalTimeSlot {
  dayOfWeek: number;
  hour: number;
  label: string;
  reason: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  engagementScore: number;
}

interface RescheduleDialogProps {
  open: boolean;
  postId: string | null;
  originalDate: string | null;
  targetDate: Date | null;
  platforms?: string[];
  suggestedHour?: number | null;
  onClose: () => void;
  onConfirm: (postId: string, newScheduledAt: string) => Promise<void>;
}

function getDefaultTime(targetDate: Date | null, suggestedHour?: number | null): string {
  if (!targetDate) return "";
  const d = new Date(targetDate);
  d.setHours(suggestedHour ?? 9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getConfidenceBadgeClass(confidence: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (confidence) {
    case "HIGH":
      return "text-success border-success";
    case "MEDIUM":
      return "text-warning border-warning";
    case "LOW":
      return "text-muted-foreground border-border";
  }
}

export function RescheduleDialog({
  open,
  postId,
  originalDate,
  targetDate,
  platforms,
  suggestedHour,
  onClose,
  onConfirm,
}: RescheduleDialogProps) {
  const [selectedTime, setSelectedTime] = useState(() => getDefaultTime(targetDate, suggestedHour));
  const [isPending, startTransition_] = useTransition();
  const [optimisticSuccess, setOptimisticSuccess] = useState(false);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeSlot[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Fetch optimal times when dialog opens
  useEffect(() => {
    if (!open || !targetDate || !platforms || platforms.length === 0) {
      setOptimalTimes([]);
      return;
    }

    const fetchOptimalTimes = async () => {
      setLoadingTimes(true);
      try {
        const allTimes: OptimalTimeSlot[] = [];
        const dateStr = targetDate.toISOString().slice(0, 10);

        await Promise.all(
          platforms.map(async (platform) => {
            try {
              const res = await fetch(
                `/api/calendar/optimal-times?platform=${encodeURIComponent(platform)}&date=${dateStr}`
              );
              if (res.ok) {
                const data = await res.json();
                allTimes.push(...(data.optimalTimes ?? []));
              }
            } catch {
              // Silently fail per-platform fetch
            }
          })
        );

        // Deduplicate by dayOfWeek+hour, keeping highest engagement
        const seen = new Map<string, OptimalTimeSlot>();
        for (const t of allTimes) {
          const key = `${t.dayOfWeek}-${t.hour}`;
          if (!seen.has(key) || t.engagementScore > seen.get(key)!.engagementScore) {
            seen.set(key, t);
          }
        }

        setOptimalTimes(
          Array.from(seen.values()).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 5)
        );
      } finally {
        setLoadingTimes(false);
      }
    };

    void fetchOptimalTimes();
  }, [open, targetDate, platforms]);

  // Reset time when dialog opens with a new target
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setOptimisticSuccess(false);
      setOptimalTimes([]);
    } else if (targetDate) {
      setSelectedTime(getDefaultTime(targetDate, suggestedHour));
    }
  }, [onClose, targetDate, suggestedHour]);

  const suggestedTimes = targetDate && optimalTimes.length > 0
    ? optimalTimes.map((ot) => {
        const d = new Date(targetDate);
        // Adjust to the suggested day of week if different
        const dayDiff = ot.dayOfWeek - d.getDay();
        d.setDate(d.getDate() + dayDiff);
        d.setHours(ot.hour, 0, 0, 0);
        return { ...ot, datetime: d };
      })
    : [];

  const handleConfirm = async () => {
    if (!postId || !selectedTime) return;

    setOptimisticSuccess(true);
    startTransition_(async () => {
      try {
        await onConfirm(postId, new Date(selectedTime).toISOString());
        notifySuccessWithCategory("Post rescheduled", {
          category: "post_publish",
          description: `New time: ${new Date(selectedTime).toLocaleString()}`,
        });
      } catch {
        setOptimisticSuccess(false);
        notifyErrorWithCategory("Failed to reschedule post", { category: "post_publish" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Post</DialogTitle>
          <DialogDescription>
            {originalDate
              ? `Originally scheduled for ${new Date(originalDate).toLocaleString()}`
              : "Pick a new date and time for this post."}
          </DialogDescription>
        </DialogHeader>

        {/* Date & Time Picker */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-datetime">Date & Time</Label>
            <Input
              id="reschedule-datetime"
              type="datetime-local"
              value={selectedTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="border-border focus-within:border-brand"
            />
          </div>

          {/* AI Suggested Times */}
          {loadingTimes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-brand" weight="fill" />
                <span className="text-sm font-medium">AI-suggested times</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-28 rounded-sm" />
                ))}
              </div>
            </div>
          )}

          {!loadingTimes && suggestedTimes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-brand" weight="fill" />
                <span className="text-sm font-medium">AI-suggested times</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTimes.map((st, i) => {
                  const timeIso = st.datetime.toISOString().slice(0, 16);
                  const isSelected = selectedTime === timeIso;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedTime(timeIso)}
                      className="flex flex-col items-start rounded-sm border border-border/50 bg-card p-2 transition-colors hover:bg-muted hover:border-brand/50 text-left"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {st.label}
                      </span>
                      <span className="text-micro text-muted-foreground">
                        {st.reason}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-micro normal-case px-1 py-0 ${getConfidenceBadgeClass(st.confidence)}`}
                        >
                          {st.confidence}
                        </Badge>
                        {isSelected && (
                          <Badge
                            variant="default"
                            className="text-micro normal-case px-1 py-0"
                          >
                            Selected
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTime || isPending}
            className={optimisticSuccess ? "bg-success hover:bg-success/90" : ""}
          >
            {optimisticSuccess ? "✓ Rescheduled" : isPending ? "Rescheduling..." : "Confirm Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
