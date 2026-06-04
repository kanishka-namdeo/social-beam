"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkle, CheckCircle, X } from "@phosphor-icons/react/ssr";

interface FieldSuggestion {
  fieldName: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  signalCount: number;
  reasoning: string;
  createdAt: string | Date;
}

function getConfidenceBadge(confidence: number): string {
  if (confidence >= 0.7) return "bg-success/10 text-success border-success/20";
  if (confidence >= 0.5) return "bg-warning/10 text-warning border-warning/20";
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

export function BrandLearningWidget() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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
    void loadSuggestions();
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
    .slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Suggested Updates
          </CardTitle>
          <CardDescription>Loading learning signals...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-sm" />
                <Skeleton className="h-8 w-20 rounded-sm" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Suggested Updates
          </CardTitle>
          <CardDescription>
            No learning suggestions right now. Keep using AI Compose and editing posts to create signals.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Suggested Updates
        </CardTitle>
        <CardDescription>
          Changes inferred from your recent post edits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleSuggestions.map((suggestion) => (
          <div key={suggestion.fieldName} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {formatFieldName(suggestion.fieldName)}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs normal-case tracking-normal",
                    getConfidenceBadge(suggestion.confidence),
                  )}
                >
                  {getConfidenceLabel(suggestion.confidence)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {suggestion.signalCount} edit{suggestion.signalCount !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-foreground">{suggestion.reasoning}</p>
            </div>

            <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}