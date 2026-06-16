"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRESET_COLORS = [
  { name: "red", className: "bg-destructive" },
  { name: "blue", className: "bg-info" },
  { name: "green", className: "bg-success" },
  { name: "yellow", className: "bg-warning" },
  { name: "purple", className: "bg-brand" },
];

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date;
  onSuccess: () => void;
}

export function AddNoteDialog({ open, onOpenChange, date, onSuccess }: AddNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blockScheduling, setBlockScheduling] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/calendar/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          title: title.trim(),
          description: description.trim() || undefined,
          blockScheduling,
          color,
        }),
      });

      if (!res.ok) throw new Error("Failed to create note");

      toast.success("Note added");
      setTitle("");
      setDescription("");
      setBlockScheduling(false);
      setColor(null);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            {format(date, "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="e.g. Product launch, Holiday..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-desc">Description (optional)</Label>
            <Textarea
              id="note-desc"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="block-scheduling">Block scheduling</Label>
              <p className="text-micro text-muted-foreground">Prevent posts from being scheduled on this day</p>
            </div>
            <Switch
              id="block-scheduling"
              checked={blockScheduling}
              onCheckedChange={setBlockScheduling}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(color === c.name ? null : c.name)}
                  className={cn(
                    "size-7 rounded-full transition-all",
                    c.className,
                    color === c.name ? "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100"
                  )}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting}>
              {submitting ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
