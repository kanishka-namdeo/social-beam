"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const NAV_SHORTCUTS: Record<string, string> = {
  g: "/dashboard",
  d: "/dashboard",
  n: "/compose",
  c: "/calendar",
  a: "/analytics",
  r: "/reddit/trending",
  m: "/media",
  s: "/settings",
};

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // "G D" two-key sequence for dashboard
      if (key === "g") {
        e.preventDefault();
        gPressed = true;
        if (gTimeout) clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        if (gTimeout) clearTimeout(gTimeout);
        const route = NAV_SHORTCUTS["d"];
        if (route) {
          router.push(route);
        }
        return;
      }

      const route = NAV_SHORTCUTS[key];
      if (route) {
        e.preventDefault();
        router.push(route);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [router]);

  return null;
}
