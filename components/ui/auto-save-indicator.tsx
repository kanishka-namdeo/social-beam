"use client";

import { useEffect } from "react";
import { CheckCircle, Spinner, WarningCircle } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export type AutoSaveState = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  state: AutoSaveState;
  className?: string;
}

export function AutoSaveIndicator({ state, className }: AutoSaveIndicatorProps) {
  useEffect(() => {
    if (state === "saved") {
      const timer = setTimeout(() => {
        // parent should handle reset to idle via its own state
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-all duration-[var(--duration-normal)]",
        state === "saving" && "text-muted-foreground",
        state === "saved" && "text-success",
        state === "error" && "text-destructive",
        className,
      )}
    >
      {state === "saving" && (
        <>
          <Spinner className="size-3 animate-spin" weight="bold" />
          Saving...
        </>
      )}
      {state === "saved" && (
        <>
          <CheckCircle className="size-3" weight="bold" />
          Saved
        </>
      )}
      {state === "error" && (
        <>
          <WarningCircle className="size-3" weight="bold" />
          Failed to save
        </>
      )}
    </span>
  );
}
