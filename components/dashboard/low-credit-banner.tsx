"use client";

import { useEffect, useState } from "react";
import { X, Warning } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "socialbeam:low-credit-banner-dismissed";

export function LowCreditBanner() {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-destructive/5 px-4 py-2 text-sm text-destructive border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-2">
        <Warning className="size-4 text-destructive" weight="fill" />
        <span>Low AI credits remaining.</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-destructive underline"
          asChild
        >
          <a href="/dashboard/settings">Manage credits</a>
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-destructive"
        onClick={handleDismiss}
        aria-label="Dismiss low credits warning"
      >
        <X className="size-4" weight="bold" />
      </Button>
    </div>
  );
}
