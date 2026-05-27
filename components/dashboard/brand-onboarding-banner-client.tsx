"use client";

import { useState } from "react";
import { BrandOnboardingBanner } from "./brand-onboarding-banner";

export function BrandOnboardingBannerClient() {
  const [showBanner, setShowBanner] = useState(true);

  const handleGetStarted = () => {
    const input = document.getElementById("brand-url") as HTMLInputElement | null;
    input?.focus();
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <BrandOnboardingBanner
      onGetStarted={handleGetStarted}
      onDismiss={handleDismiss}
    />
  );
}
