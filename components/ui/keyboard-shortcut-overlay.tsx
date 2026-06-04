"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

interface KeyboardShortcutOverlayProps {
  shortcuts: ShortcutGroup[];
}

export function KeyboardShortcutOverlay({ shortcuts }: KeyboardShortcutOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && (e.shiftKey || e.code === "Slash")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((group) => (
            <div key={group.title}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">{group.title}</h4>
              <div className="space-y-2">
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{s.description}</span>
                    <div className="flex gap-1">
                      {s.keys.map((key) => (
                        <kbd
                          key={key}
                          className={cn(
                            "inline-flex min-w-[24px] items-center justify-center rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground",
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Press <kbd className="font-mono">Shift + ?</kbd> to toggle this overlay
        </p>
      </DialogContent>
    </Dialog>
  );
}
