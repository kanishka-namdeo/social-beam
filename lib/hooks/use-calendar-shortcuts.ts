"use client";

import { useEffect, useState, useCallback } from "react";

type CalendarView = "month" | "week" | "day" | "list";

interface ShortcutCallbacks {
  setView: (view: CalendarView) => void;
  goToday: () => void;
  goNext: () => void;
  goPrev: () => void;
}

interface ShortcutDef {
  key: string;
  label: string;
  action: string;
}

export const CALENDAR_SHORTCUTS: ShortcutDef[] = [
  { key: "M", label: "M", action: "Month view" },
  { key: "W", label: "W", action: "Week view" },
  { key: "D", label: "D", action: "Day view" },
  { key: "L", label: "L", action: "List view" },
  { key: "T", label: "T", action: "Go to today" },
  { key: "N", label: "N / →", action: "Next period" },
  { key: "P", label: "P / ←", action: "Previous period" },
  { key: "C", label: "C", action: "Compose new post" },
  { key: "?", label: "?", action: "Show shortcuts" },
];

export function useCalendarShortcuts(callbacks: ShortcutCallbacks) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key;

      switch (key) {
        case "m":
        case "M":
          callbacks.setView("month");
          break;
        case "w":
        case "W":
          callbacks.setView("week");
          break;
        case "d":
        case "D":
          callbacks.setView("day");
          break;
        case "l":
        case "L":
          callbacks.setView("list");
          break;
        case "t":
        case "T":
          callbacks.goToday();
          break;
        case "n":
        case "N":
        case "ArrowRight":
          callbacks.goNext();
          break;
        case "p":
        case "P":
        case "ArrowLeft":
          callbacks.goPrev();
          break;
        case "c":
        case "C":
          window.location.href = "/dashboard/compose";
          break;
        case "?":
          setShowHelp((prev) => !prev);
          break;
      }
    },
    [callbacks]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp, shortcuts: CALENDAR_SHORTCUTS };
}
