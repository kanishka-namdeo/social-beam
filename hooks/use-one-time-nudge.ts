"use client";

import { useState, useEffect } from "react";

/**
 * Shows a one-time nudge per user action, persisted to localStorage.
 * Once dismissed, the nudge never reappears.
 */
export function useOneTimeNudge(key: string, deps: unknown[] = []) {
  const storageKey = `social-beam-nudge-${key}`;
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setIsVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, ...deps]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setIsVisible(false);
  };

  return { isVisible, dismiss };
}
