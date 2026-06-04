"use client";

import { useEffect, useState } from "react";
import { BrandContextStatusBanner } from "./brand-context-status-banner";

interface BrandContextStatusBannerClientProps {
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
}

const DISMISSED_KEY = "social-beam-brand-status-dismissed";

export function BrandContextStatusBannerClient({ brandContext }: BrandContextStatusBannerClientProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");

      const listener = () => setDismissed(true);
      window.addEventListener("brand-status-dismissed", listener);
      return () => window.removeEventListener("brand-status-dismissed", listener);
    }
  }, []);

  if (dismissed) {
    return null;
  }

  return <BrandContextStatusBanner brandContext={brandContext} />;
}
