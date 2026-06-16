"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CALENDAR_SHORTCUTS } from "@/lib/hooks/use-calendar-shortcuts";

interface CalendarShortcutsProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CalendarShortcuts({ open, onOpenChange }: CalendarShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-mono">?</kbd> to toggle this dialog
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {CALENDAR_SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-sm border border-border px-3 py-2">
              <span className="text-sm text-foreground">{s.action}</span>
              <kbd className="rounded-sm bg-muted px-2 py-0.5 text-xs font-mono font-medium text-foreground">
                {s.label}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
