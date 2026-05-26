"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Sparkle,
  CheckCircle,
  X,
  Warning,
  ListMagnifyingGlass,
  PencilSimple,
  ThumbsUp,
  ThumbsDown,
  Trash,
  Robot,
  ChatText,
} from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

interface FieldSuggestion {
  fieldName: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  signalCount: number;
  reasoning: string;
  createdAt: string | Date;
}

interface LearningSignal {
  id: string;
  signalType: string;
  fieldName: string;
  direction: string;
  magnitude: number;
  confidence: number;
  createdAt: string;
  metadata: unknown;
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

function getSignalTypeIcon(type: string) {
  switch (type) {
    case "post_edit_diff": return <PencilSimple className="size-3.5" />;
    case "thumbs_up": return <ThumbsUp className="size-3.5" weight="fill" />;
    case "thumbs_down": return <ThumbsDown className="size-3.5" weight="fill" />;
    case "auto_detected": return <Robot className="size-3.5" />;
    case "user_feedback": return <ChatText className="size-3.5" />;
    default: return <ListMagnifyingGlass className="size-3.5" />;
  }
}

function formatFieldName(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

function getDirectionBadgeClass(direction: string): string {
  switch (direction) {
    case "increase": return "bg-info/10 text-info border-info/20";
    case "decrease": return "bg-warning/10 text-warning border-warning/20";
    case "avoid": return "bg-destructive/10 text-destructive border-destructive/20";
    case "replace": return "bg-accent/10 text-accent-foreground border-accent/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function BrandLearningCard() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Learning feed state
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsPage, setSignalsPage] = useState(1);
  const [signalsTotal, setSignalsTotal] = useState(0);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/suggest");
      if (!res.ok) {
        setError("Failed to fetch suggestions.");
        return;
      }
      const json = await res.json();
      setSuggestions(json.data?.suggestions ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSignals = useCallback(async (page = 1) => {
    setSignalsLoading(true);
    try {
      const res = await fetch(`/api/brand-context/signals?page=${page}&limit=10`);
      if (!res.ok) return;
      const json = await res.json();
      setSignals(json.data ?? []);
      setSignalsTotal(json.pagination?.total ?? 0);
      setSignalsPage(page);
    } catch {
      // silently fail
    } finally {
      setSignalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuggestions();
    void fetchSignals();
  }, [fetchSuggestions, fetchSignals]);

  async function handleApply(fieldName: string, newValue: unknown) {
    setApplying(fieldName);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/apply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, newValue }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to apply suggestion.");
        return;
      }
      setDismissed((prev) => new Set(prev).add(fieldName));
      router.refresh();
      fetchSuggestions();
      fetchSignals(signalsPage);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApplying(null);
    }
  }

  function handleDismiss(fieldName: string) {
    setDismissed((prev) => new Set(prev).add(fieldName));
  }

  async function handleDismissSignal(signalId: string) {
    try {
      await fetch(`/api/brand-context/signals?id=${signalId}`, { method: "DELETE" });
      setSignals((prev) => prev.filter((s) => s.id !== signalId));
      setSignalsTotal((prev) => prev - 1);
    } catch {
      // silently fail
    }
  }

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissed.has(s.fieldName),
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Suggested Updates
          </CardTitle>
          <CardDescription>
            Loading learning signals...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suggested Updates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkle className="size-5 text-brand" weight="fill" />
                Suggested Updates
              </CardTitle>
              <CardDescription>
                Changes inferred from your recent post edits.
              </CardDescription>
            </div>
            <Badge variant="outline" className="normal-case">
              {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleSuggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No suggested updates right now. The system learns from your edits and suggests improvements here.
            </p>
          )}
          {visibleSuggestions.map((suggestion) => (
            <div key={suggestion.fieldName} className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground capitalize">
                      {suggestion.fieldName.replace(/([A-Z])/g, " $1").trim()}
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

              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Learning Feed */}
      <Card>
        <Accordion type="single" collapsible defaultValue="learning-feed">
          <AccordionItem value="learning-feed" className="border-0">
            <AccordionTrigger className="px-6">
              <div className="flex items-center gap-2">
                <ListMagnifyingGlass className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Learning Feed</span>
                <Badge variant="secondary" className="text-xs ml-2">
                  {signalsTotal} signals
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="px-6 pb-6 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Raw signals captured from your edits. Each signal represents a learning event the system recorded.
                </p>

                {signalsLoading && (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <Skeleton className="size-4 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!signalsLoading && signals.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No learning signals captured yet. Start using AI Compose and editing the generated content to create signals.
                  </div>
                )}

                {!signalsLoading && signals.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {signals.map((signal) => {
                      const meta = signal.metadata as Record<string, unknown> | null;
                      const diffSummary = meta?.diffSummary as string | undefined;
                      return (
                        <div
                          key={signal.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5 text-muted-foreground">
                              {getSignalTypeIcon(signal.signalType)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {formatFieldName(signal.fieldName)}
                                </span>
                                <Badge variant="outline" className={cn("text-xs normal-case capitalize", getDirectionBadgeClass(signal.direction))}>
                                  {signal.direction}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(signal.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">
                                  {signal.signalType.replace(/_/g, " ")}
                                </span>
                                <span>&middot;</span>
                                <span>mag {Math.abs(signal.magnitude).toFixed(2)}</span>
                                <span>&middot;</span>
                                <span>{(signal.confidence * 100).toFixed(0)}% conf</span>
                              </div>
                              {diffSummary && (
                                <p className="text-xs text-muted-foreground/70 italic">
                                  {diffSummary}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive min-h-8"
                            onClick={() => handleDismissSignal(signal.id)}
                            aria-label="Dismiss signal"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!signalsLoading && signalsTotal > 10 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {signalsPage} of {Math.ceil(signalsTotal / 10)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={signalsPage <= 1}
                        onClick={() => fetchSignals(signalsPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={signalsPage * 10 >= signalsTotal}
                        onClick={() => fetchSignals(signalsPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {error && (
        <Alert variant="destructive">
          <Warning className="size-4" weight="fill" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
