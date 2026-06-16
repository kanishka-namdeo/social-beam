"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkle, CheckCircle, X } from "@phosphor-icons/react/ssr";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface FieldSuggestion {
  fieldName: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  signalCount: number;
  reasoning: string;
  createdAt: string | Date;
}

interface BrandLearningWidgetProps {
  size?: WidgetSizeToken;
}

function getConfidenceBadge(confidence: number): string {
  if (confidence >= 0.7) return "bg-alert-success text-success border-alert-success-border";
  if (confidence >= 0.5) return "bg-alert-warning text-warning border-alert-warning-border";
  return "bg-muted text-muted-foreground";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function formatFieldName(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export function BrandLearningWidget({ size = "10x3" }: BrandLearningWidgetProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { isWide, isTall } = getSizeDerivatives(size);

  const maxSuggestions = isTall ? 3 : isWide ? 2 : 1;

  async function loadSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/brand-context/suggest");
      if (!res.ok) return;
      const json = await res.json();
      setSuggestions(json.data?.suggestions ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchSuggestions() {
      if (cancelled) return;
      await loadSuggestions();
    }

    void fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleApply(fieldName: string, newValue: unknown) {
    setApplying(fieldName);
    try {
      const res = await fetch("/api/brand-context/apply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, newValue }),
      });
      if (!res.ok) return;
      setDismissed((prev) => new Set(prev).add(fieldName));
      router.refresh();
      await loadSuggestions();
    } catch {
      // silently fail
    } finally {
      setApplying(null);
    }
  }

  function handleDismiss(fieldName: string) {
    setDismissed((prev) => new Set(prev).add(fieldName));
  }

  const visibleSuggestions = suggestions
    .filter((s) => !dismissed.has(s.fieldName))
    .slice(0, maxSuggestions);

  return (
    <BaseWidget
      size={size}
      isLoading={loading}
      isEmpty={visibleSuggestions.length === 0}
      emptyState={{
        icon: <Sparkle className="size-8" weight="light" />,
        message: "No learning suggestions",
        description: "Keep using AI Compose and editing posts to create signals.",
      }}
      className="border-ai-surface bg-ai-surface border-l-2 border-l-brand"
      header={{
        title: "Suggested Updates",
        icon: <Sparkle className="size-5 text-brand" weight="fill" />,
        description: "Changes inferred from your recent post edits.",
      }}
    >
      <div className={cn("space-y-panel", isWide && "grid grid-cols-2 gap-panel")}>
        {visibleSuggestions.map((suggestion) => (
          <div key={suggestion.fieldName} className="space-y-section">
            <div className="space-y-tight min-w-0">
              <div className="flex items-center gap-control min-w-0">
                <p className="text-body font-medium text-foreground truncate flex-1 min-w-0">
                  {formatFieldName(suggestion.fieldName)}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-micro normal-case tracking-normal shrink-0",
                    getConfidenceBadge(suggestion.confidence),
                  )}
                >
                  {getConfidenceLabel(suggestion.confidence)}
                </Badge>
              </div>
              <p className="text-caption text-muted-foreground tabular-nums">
                Based on {suggestion.signalCount} edit{suggestion.signalCount !== 1 ? "s" : ""}
              </p>
              <p className="text-body text-foreground line-clamp-3">{suggestion.reasoning}</p>
            </div>

            <div className="flex flex-wrap gap-control">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApply(suggestion.fieldName, suggestion.suggestedValue)}
                disabled={applying === suggestion.fieldName}
                className="min-h-10 gap-1.5"
              >
                <CheckCircle className="size-3.5" weight="fill" />
                {applying === suggestion.fieldName ? "Applying..." : "Apply"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismiss(suggestion.fieldName)}
                disabled={applying === suggestion.fieldName}
                className="min-h-10 gap-1.5"
              >
                <X className="size-3.5" />
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </BaseWidget>
  );
}
