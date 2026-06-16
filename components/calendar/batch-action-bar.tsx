"use client";

import { ArrowsClockwise, Trash, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface BatchActionBarProps {
  selectedCount: number;
  onReschedule: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BatchActionBar({ selectedCount, onReschedule, onDelete, onClear }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-2.5 shadow-lg">
        <Badge variant="secondary" className="tabular-nums">
          {selectedCount} selected
        </Badge>
        <div className="h-5 w-px bg-border" />
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={onReschedule}>
          <ArrowsClockwise className="size-3.5" />
          Reschedule
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash className="size-3.5" />
          Delete
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClear} aria-label="Clear selection">
          <X className="size-4" />
        </Button>
      </Card>
    </div>
  );
}
