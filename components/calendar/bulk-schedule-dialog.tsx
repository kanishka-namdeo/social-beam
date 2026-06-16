"use client";

import { useEffect, useState } from "react";
import { Stack } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface DraftPost {
  id: string;
  title: string | null;
  content: any;
  platforms: Array<{ platform: string }>;
}

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "select" | "dates" | "frequency" | "review";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "every_other_day", label: "Every other day" },
  { value: "3x_per_week", label: "3x per week" },
  { value: "weekly", label: "Weekly" },
];

export function BulkScheduleDialog({ open, onOpenChange, onSuccess }: BulkScheduleDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDrafts();
      setStep("select");
      setSelectedPostIds([]);
      setStartDate("");
      setEndDate("");
      setFrequency("");
    }
  }, [open]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/posts?status=DRAFT");
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.posts || []);
      }
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePost = (postId: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const canProceed = () => {
    if (step === "select") return selectedPostIds.length > 0;
    if (step === "dates") return startDate && endDate;
    if (step === "frequency") return frequency !== "";
    return true;
  };

  const nextStep = () => {
    if (step === "select") setStep("dates");
    else if (step === "dates") setStep("frequency");
    else if (step === "frequency") setStep("review");
  };

  const prevStep = () => {
    if (step === "dates") setStep("select");
    else if (step === "frequency") setStep("dates");
    else if (step === "review") setStep("frequency");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/calendar/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postIds: selectedPostIds,
          startDate,
          endDate,
          frequency,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        notifySuccessWithCategory(`${data.count} posts scheduled`, {
          category: "post_publish",
          description: `Posts have been scheduled from ${startDate} to ${endDate}`,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule posts");
      }
    } catch (error) {
      console.error("Bulk schedule failed:", error);
      notifyErrorWithCategory("Bulk scheduling failed", {
        category: "post_publish",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDrafts = drafts.filter((d) => selectedPostIds.includes(d.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stack className="size-5 text-brand" weight="fill" />
            Bulk Schedule
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select draft posts to schedule"}
            {step === "dates" && "Choose the date range for scheduling"}
            {step === "frequency" && "Set the posting frequency"}
            {step === "review" && "Review and confirm scheduling"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px]">
          {step === "select" && (
            <div className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No draft posts available</p>
                  <p className="text-sm mt-1">Create some drafts first to use bulk scheduling</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {drafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => togglePost(draft.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedPostIds.includes(draft.id)
                          ? "border-brand bg-brand/5"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-4 rounded border-2 flex items-center justify-center",
                            selectedPostIds.includes(draft.id)
                              ? "border-brand bg-brand"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {selectedPostIds.includes(draft.id) && (
                            <svg className="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {draft.title || "Untitled draft"}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {draft.platforms?.slice(0, 3).map((p: { platform: string }) => (
                              <Badge key={p.platform} variant="outline" className="text-xs">
                                {p.platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPostIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedPostIds.length} post{selectedPostIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          )}

          {step === "frequency" && (
            <div className="space-y-3">
              <Label>Posting Frequency</Label>
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  onClick={() => setFrequency(freq.value)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    frequency === freq.value
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <span className="text-sm font-medium">{freq.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Posts</span>
                  <span className="font-medium">{selectedPostIds.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-medium">{startDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-medium">{endDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium">
                    {FREQUENCIES.find((f) => f.value === frequency)?.label}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Posts to schedule</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {selectedDrafts.map((draft) => (
                    <div key={draft.id} className="text-sm text-muted-foreground truncate">
                      {draft.title || "Untitled draft"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step !== "select" && (
            <Button variant="outline" onClick={prevStep} disabled={submitting}>
              Back
            </Button>
          )}
          {step !== "review" ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule Posts"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
