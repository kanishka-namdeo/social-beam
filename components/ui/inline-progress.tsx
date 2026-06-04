"use client";

import { cn } from "@/lib/utils";

interface InlineProgressProps {
  progress: number | null; // null = indeterminate, 0-100 = determinate
  className?: string;
}

export function InlineProgress({ progress, className }: InlineProgressProps) {
  return (
    <div className={cn("h-0.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      {progress !== null ? (
        <div
          className="h-full bg-brand transition-all duration-slow ease-decelerate"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      ) : (
        <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      )}
    </div>
  );
}
