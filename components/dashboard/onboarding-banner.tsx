"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Warning } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

export function OnboardingBanner() {
  const [skipping, setSkipping] = useState(false);
  const router = useRouter();

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await fetch("/api/onboarding/skip", { method: "POST" });
      toast.info("Onboarding skipped. You can always complete it later in Settings.");
      router.refresh();
    } catch (error) {
      toast.error("Failed to skip onboarding. Redirecting...");
      router.push("/onboarding");
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
      <Warning className="size-5 text-warning mt-0.5 shrink-0" weight="fill" />
      <div className="flex-1">
        <p className="font-medium">Onboarding incomplete</p>
        <p className="text-muted-foreground mt-1">
          You haven&apos;t finished setting up your AI assistant. Complete onboarding for a personalized experience.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => { router.push("/onboarding"); }}>
            Continue Onboarding
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={skipping}
          >
            {skipping ? "Skipping..." : "Skip"}
          </Button>
        </div>
      </div>
    </div>
  );
}
