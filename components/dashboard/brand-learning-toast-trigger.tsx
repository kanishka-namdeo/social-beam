"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface FieldSuggestion {
  fieldName: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  signalCount: number;
  reasoning: string;
  createdAt: string | Date;
}

function getDismissKey(fieldName: string): string {
  return `dismissed-learning-${fieldName}`;
}

function getCooldownKey(fieldName: string): string {
  return `last-learning-toast-${fieldName}`;
}

function isDismissed(fieldName: string): boolean {
  return sessionStorage.getItem(getDismissKey(fieldName)) !== null;
}

function isCooldownActive(fieldName: string): boolean {
  const lastShown = localStorage.getItem(getCooldownKey(fieldName));
  if (!lastShown) return false;
  const elapsed = Date.now() - Number(lastShown);
  return elapsed < COOLDOWN_MS;
}

function markCooldown(fieldName: string): void {
  localStorage.setItem(getCooldownKey(fieldName), String(Date.now()));
}

function markDismissed(fieldName: string): void {
  sessionStorage.setItem(getDismissKey(fieldName), "1");
}

export function BrandLearningToastTrigger() {
  const router = useRouter();
  const hasTriggeredRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVisibleRef = useRef(true);

  async function fetchSuggestions(): Promise<FieldSuggestion[]> {
    try {
      const res = await fetch("/api/brand-context/suggest", {
        signal: abortControllerRef.current?.signal,
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.suggestions ?? []) as FieldSuggestion[];
    } catch {
      return [];
    }
  }

  async function handleApply(fieldName: string, newValue: unknown) {
    try {
      const res = await fetch("/api/brand-context/apply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, newValue }),
      });
      if (!res.ok) {
        toast.error("Failed to apply suggestion");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Network error while applying suggestion");
    }
  }

  function handleDismiss(fieldName: string) {
    markDismissed(fieldName);
  }

  function checkAndShowToast() {
    void (async () => {
      const suggestions = await fetchSuggestions();
      const eligible = suggestions.filter(
        (s) =>
          s.confidence >= 0.5 &&
          !isDismissed(s.fieldName) &&
          !isCooldownActive(s.fieldName),
      );

      if (eligible.length > 0 && !hasTriggeredRef.current) {
        const suggestion = eligible[0];
        hasTriggeredRef.current = true;
        markCooldown(suggestion.fieldName);

        toast.info("Brand Learning Suggestion", {
          description: suggestion.reasoning,
          duration: 10000,
          action: {
            label: "Apply",
            onClick: () => {
              void handleApply(suggestion.fieldName, suggestion.suggestedValue);
            },
          },
          cancel: {
            label: "Dismiss",
            onClick: () => {
              handleDismiss(suggestion.fieldName);
            },
          },
        });
      }
    })();
  }

  function startPolling() {
    // Create a fresh AbortController for each polling session so previous
    // aborted controllers don't silently block new fetches
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(checkAndShowToast, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    abortControllerRef.current = new AbortController();

    // Trigger once on mount
    checkAndShowToast();

    // Start polling when visible
    startPolling();

    // Handle visibility changes to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        isVisibleRef.current = true;
        startPolling();
      } else {
        isVisibleRef.current = false;
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortControllerRef.current?.abort();
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run on mount/cleanup
  }, []);

  return <></>;
}
