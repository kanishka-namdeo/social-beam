"use client";

import { NotePencil, Prohibit } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface CalendarNoteItem {
  id: string;
  title: string;
  color: string | null;
  blockScheduling: boolean;
}

interface NoteIndicatorProps {
  notes: CalendarNoteItem[];
  onNoteClick?: (note: CalendarNoteItem) => void;
}

const NOTE_COLORS: Record<string, string> = {
  red: "bg-destructive",
  blue: "bg-info",
  green: "bg-success",
  yellow: "bg-warning",
  purple: "bg-brand",
};

export function NoteIndicator({ notes, onNoteClick }: NoteIndicatorProps) {
  if (notes.length === 0) return null;

  const hasBlocked = notes.some((n) => n.blockScheduling);

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {hasBlocked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-destructive/10 px-1 py-0.5 text-micro text-destructive cursor-default">
              <Prohibit className="size-3" weight="fill" />
              Blocked
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Scheduling is blocked on this day
          </TooltipContent>
        </Tooltip>
      )}
      {notes.map((note) => {
        const colorClass = note.color ? NOTE_COLORS[note.color] ?? "bg-muted-foreground" : "bg-muted-foreground";
        return (
          <Tooltip key={note.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-sm px-1 py-0.5 text-micro text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onNoteClick?.(note);
                }}
              >
                <span className={cn("size-1.5 rounded-full shrink-0", colorClass)} />
                <span className="truncate max-w-[60px]">{note.title}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="flex items-center gap-1">
                <NotePencil className="size-3" />
                {note.title}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
