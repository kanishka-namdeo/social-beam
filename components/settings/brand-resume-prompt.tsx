"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkle,
  CheckCircle,
  ArrowRight,
  Trash,
  Globe,
  Robot,
  Target,
  Spinner,
} from "@phosphor-icons/react/ssr";

const CHECKPOINT_STEPS = [
  { key: "collected", label: "Website crawled", icon: Globe },
  { key: "pages_selected", label: "Pages selected", icon: Globe },
  { key: "brand_analyzed", label: "Brand identity analyzed", icon: Robot },
  { key: "platforms_ready", label: "Platform strategies generated", icon: Target },
  { key: "samples_ready", label: "Sample posts created", icon: Sparkle },
];

interface BrandResumePromptProps {
  draft: {
    checkpointStep: string;
    createdAt: string | Date;
    inputUrl?: string | null;
    inputDescription?: string | null;
    partialSummary: string;
    hasBrandContextDraft: boolean;
    hasPlatformContextsDraft: boolean;
    hasSamplePosts: boolean;
  };
  onResume: () => void;
  onDiscard: () => void;
  isResuming?: boolean;
}

function getRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 5) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

export function BrandResumePrompt({
  draft,
  onResume,
  onDiscard,
  isResuming = false,
}: BrandResumePromptProps) {
  const checkpointIndex = CHECKPOINT_STEPS.findIndex((s) => s.key === draft.checkpointStep);
  const completedSteps = checkpointIndex >= 0 ? checkpointIndex + 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Continue your brand analysis?
        </CardTitle>
        <CardDescription>
          {draft.inputUrl
            ? `You were analyzing "${draft.inputUrl}". ${draft.partialSummary}.`
            : draft.inputDescription
              ? `You were analyzing your brand. ${draft.partialSummary}.`
              : `${draft.partialSummary}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-sm border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            Progress: {completedSteps} of {CHECKPOINT_STEPS.length} steps completed
          </p>
          <div className="space-y-2">
            {CHECKPOINT_STEPS.map((step, idx) => {
              const isComplete = idx <= checkpointIndex;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-2 text-sm">
                  {isComplete ? (
                    <CheckCircle className="size-4 text-success" weight="fill" />
                  ) : (
                    <div className="size-4 rounded-sm border border-border" />
                  )}
                  <span className={isComplete ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {draft.inputUrl && (
            <Badge variant="secondary" className="mt-2">
              <Globe className="size-3 mr-1" />
              {draft.inputUrl}
            </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onResume}
            disabled={isResuming}
            className="flex-1 min-h-10"
          >
            {isResuming ? (
              <>
                <Spinner className="size-4 mr-2 animate-spin" />
                Resuming...
              </>
            ) : (
              <>
                <ArrowRight className="size-4 mr-2" />
                Resume Analysis
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            className="min-h-10"
          >
            <Trash className="size-4 mr-2" />
            Start Fresh
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Started {getRelativeTime(draft.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
