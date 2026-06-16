"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface HourSlotProps {
  date: Date;
  hour: number;
  className?: string;
  children?: React.ReactNode;
  onClick?: (date: Date, hour: number) => void;
}

/**
 * A droppable hour slot for week and day views.
 * ID format: hour-YYYY-MM-DD-HH
 */
export function HourSlot({ date, hour, className, children, onClick }: HourSlotProps) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const droppableId = `hour-${dateStr}-${hour}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: "hour",
      date: dateStr,
      hour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick?.(date, hour)}
      className={cn(
        "transition-colors cursor-pointer",
        isOver && "bg-brand/10 ring-1 ring-inset ring-brand/30",
        className
      )}
    >
      {children}
    </div>
  );
}
