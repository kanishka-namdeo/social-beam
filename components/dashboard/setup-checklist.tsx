"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Circle, CaretRight } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AboutYouDialog } from "./onboarding-dialogs/about-you-dialog";
import { ConnectAccountsDialog } from "./onboarding-dialogs/connect-accounts-dialog";
import { BrandVoiceDialog } from "./onboarding-dialogs/brand-voice-dialog";
import { FirstPostDialog } from "./onboarding-dialogs/first-post-dialog";

interface SetupChecklistProps {
  workspaceId: string;
  initialProgress: {
    steps: Record<string, boolean>;
    completedCount: number;
    allComplete: boolean;
  };
  connectedPlatforms: string[];
}

interface Step {
  id: string;
  label: string;
  dialog: string;
}

const STEPS: Step[] = [
  { id: "about-you", label: "Tell us about you", dialog: "about-you" },
  { id: "connect-accounts", label: "Connect your accounts", dialog: "connect-accounts" },
  { id: "brand-voice", label: "Set your brand voice", dialog: "brand-voice" },
  { id: "first-post", label: "Create your first post", dialog: "first-post" },
];

const DISMISSED_KEY = "sb-setup-checklist-dismissed";

export function SetupChecklist({
  workspaceId,
  initialProgress,
  connectedPlatforms,
}: SetupChecklistProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(initialProgress.steps);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored === "true") {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    const setup = searchParams.get("setup");
    if (setup === "1") {
      const firstIncomplete = STEPS.find((step) => !progress[step.id]);
      if (firstIncomplete) {
        setActiveDialog(firstIncomplete.dialog);
      }
      router.replace("/dashboard");
    }
  }, [searchParams, progress, router]);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const allComplete = completedCount === STEPS.length;
  const progressPercent = (completedCount / STEPS.length) * 100;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleStepComplete = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/onboarding/progress");
      if (!response.ok) throw new Error("Failed to fetch progress");
      const data = await response.json();
      setProgress(data.steps);
    } catch (error) {
      toast.error("Failed to update progress");
    } finally {
      setRefreshing(false);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Get started</h3>
                <span className="text-sm text-muted-foreground">
                  {completedCount} of {STEPS.length} complete
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {allComplete ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  All set! Your workspace is fully configured.
                </p>
                <Button variant="outline" size="sm" onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {STEPS.map((step) => {
                    const isComplete = progress[step.id];
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveDialog(step.dialog)}
                        disabled={refreshing}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors",
                          "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isComplete ? (
                            <CheckCircle
                              className="size-5 text-success flex-shrink-0"
                              weight="fill"
                            />
                          ) : (
                            <Circle
                              className="size-5 text-muted-foreground flex-shrink-0"
                              weight="light"
                            />
                          )}
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              isComplete && "text-muted-foreground line-through"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                        {isComplete ? (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            Complete
                          </span>
                        ) : (
                          <CaretRight
                            className="size-4 text-muted-foreground flex-shrink-0 ml-2"
                            weight="bold"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="w-full text-muted-foreground"
                  >
                    Skip setup
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AboutYouDialog
        open={activeDialog === "about-you"}
        onOpenChange={(open) => setActiveDialog(open ? "about-you" : null)}
        onComplete={handleStepComplete}
        stepNumber={1}
        totalSteps={STEPS.length}
      />

      <ConnectAccountsDialog
        open={activeDialog === "connect-accounts"}
        onOpenChange={(open) => setActiveDialog(open ? "connect-accounts" : null)}
        onComplete={handleStepComplete}
        stepNumber={2}
        totalSteps={STEPS.length}
        connectedPlatforms={connectedPlatforms}
      />

      <BrandVoiceDialog
        open={activeDialog === "brand-voice"}
        onOpenChange={(open) => setActiveDialog(open ? "brand-voice" : null)}
        onComplete={handleStepComplete}
        stepNumber={3}
        totalSteps={STEPS.length}
      />

      <FirstPostDialog
        open={activeDialog === "first-post"}
        onOpenChange={(open) => setActiveDialog(open ? "first-post" : null)}
        onComplete={handleStepComplete}
        stepNumber={4}
        totalSteps={STEPS.length}
      />
    </>
  );
}
