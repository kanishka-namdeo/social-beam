"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, ArrowsOut, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  id: string;
  colSpan: 1 | 2 | 4;
  children: React.ReactNode;
  onResize?: (colSpan: 1 | 2 | 4) => void;
  onHide?: () => void;
  className?: string;
}

const COL_SPAN_CLASSES: Record<1 | 2 | 4, string> = {
  1: "col-span-1",
  2: "col-span-2",
  4: "col-span-4",
};

export function WidgetCard({
  id,
  colSpan,
  children,
  onResize,
  onHide,
  className,
}: WidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        COL_SPAN_CLASSES[colSpan],
        "group",
        isDragging && "opacity-50 scale-95",
        className
      )}
    >
      {/* Control bar — overlaid on top-right of the child widget, positioned outside card bounds */}
      <div className="absolute -top-1 -right-1 z-dropdown flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 px-1 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="flex-center rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-grab active:cursor-grabbing transition-colors focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label="Drag to reorder"
        >
          <DotsSixVertical className="size-4" weight="bold" />
        </button>
        {onResize && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-7 min-w-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Resize widget"
              >
                <ArrowsOut className="size-4" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onResize(1)}>Narrow</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResize(2)}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResize(4)}>Full</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onHide && (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-7 min-w-7 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            onClick={onHide}
            aria-label="Hide widget"
          >
            <X className="size-3.5" weight="bold" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
