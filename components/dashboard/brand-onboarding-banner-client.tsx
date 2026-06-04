"use client";

import { useState, useEffect } from "react";
import { BrandOnboardingBanner } from "./brand-onboarding-banner";

export function BrandOnboardingBannerClient() {
  const [initialDismissed, setInitialDismissed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/preferences/dismiss-banner")
      .then((res) => {
        if (!res.ok) return { dismissed: false };
        return res.json();
      })
      .then((data) => {
        setInitialDismissed(data?.data?.dismissed ?? false);
      })
      .catch(() => {
        setInitialDismissed(false);
      })
      .finally(() => {
        setChecked(true);
      });
  }, []);

  const handleGetStarted = () => {
    const input = document.getElementById("brand-url") as HTMLInputElement | null;
    input?.focus();
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!checked) {
    return null;
  }

  return (
    <BrandOnboardingBanner
      onGetStarted={handleGetStarted}
      initialDismissed={initialDismissed}
    />
  );
}
