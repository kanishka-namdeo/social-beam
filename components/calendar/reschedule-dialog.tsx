"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkle } from "@phosphor-icons/react";
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

interface RescheduleDialogProps {
  open: boolean;
  postId: string | null;
  originalDate: string | null;
  targetDate: Date | null;
  onClose: () => void;
  onConfirm: (postId: string, newScheduledAt: string) => Promise<void>;
}

// AI-suggested time slots (optimal posting windows)
const SUGGESTED_TIMES = [
  { hour: 9, minute: 0, label: "9:00 AM", reason: "Morning engagement peak" },
  { hour: 11, minute: 0, label: "11:00 AM", reason: "Lunch break window" },
  { hour: 13, minute: 0, label: "1:00 PM", reason: "Early afternoon peak" },
  { hour: 17, minute: 0, label: "5:00 PM", reason: "Evening commute" },
  { hour: 19, minute: 0, label: "7:00 PM", reason: "Prime time" },
];

function getDefaultTime(targetDate: Date | null): string {
  if (!targetDate) return "";
  const d = new Date(targetDate);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function RescheduleDialog({
  open,
  postId,
  originalDate,
  targetDate,
  onClose,
  onConfirm,
}: RescheduleDialogProps) {
  const [selectedTime, setSelectedTime] = useState(() => getDefaultTime(targetDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset time when dialog opens with a new target
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    } else if (targetDate) {
      setSelectedTime(getDefaultTime(targetDate));
    }
  }, [onClose, targetDate]);

  const suggestedTimes = targetDate
    ? SUGGESTED_TIMES.map((st) => {
        const d = new Date(targetDate);
        d.setHours(st.hour, st.minute, 0, 0);
        return { ...st, datetime: d };
      })
    : [];

  const handleConfirm = async () => {
    if (!postId || !selectedTime) return;

    setIsSubmitting(true);
    try {
      await onConfirm(postId, new Date(selectedTime).toISOString());
      toast.success("Post rescheduled", {
        description: `New time: ${new Date(selectedTime).toLocaleString()}`,
      });
    } catch {
      toast.error("Failed to reschedule post");
    } finally {
      setIsSubmitting(false);
      onClose();
    }
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
            />
          </div>

          {/* AI Suggested Times */}
          {suggestedTimes.length > 0 && (
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
                      className="flex flex-col items-start rounded-md border border-border bg-card p-2 transition-colors hover:bg-muted text-left"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {st.label}
                      </span>
                      <span className="text-[0.625rem] text-muted-foreground">
                        {st.reason}
                      </span>
                      {isSelected && (
                        <Badge
                          variant="default"
                          className="mt-1 text-[0.5rem] normal-case px-1 py-0"
                        >
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTime || isSubmitting}
          >
            {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
