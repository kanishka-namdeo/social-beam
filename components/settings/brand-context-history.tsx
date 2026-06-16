"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, ArrowCounterClockwise, Warning, Eye, X, ArrowsClockwise } from "@phosphor-icons/react/ssr";

const DISPLAY_FIELDS: Record<string, string> = {
  businessName: "Business Name",
  tagline: "Tagline",
  websiteUrl: "Website",
  industry: "Industry",
  productDesc: "Product Description",
  tonePreset: "Tone Preset",
  voiceDescription: "Voice Description",
  bannedWords: "Banned Words",
  audienceType: "Audience Type",
  interests: "Interests",
  painPoints: "Pain Points",
  competitors: "Competitors",
  goals: "Goals",
  trainingStatus: "Training Status",
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length === 0 ? "empty" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function computeDiff(
  oldSnapshot: Record<string, unknown>,
  newSnapshot: Record<string, unknown>,
): Array<{ field: string; displayField: string; type: "added" | "removed" | "changed"; oldValue?: unknown; newValue?: unknown; arrayChanges?: { added: unknown[]; removed: unknown[] } }> {
  type DiffResult = { field: string; displayField: string; type: "added" | "removed" | "changed"; oldValue?: unknown; newValue?: unknown; arrayChanges?: { added: unknown[]; removed: unknown[] } };
  const diffs: DiffResult[] = [];
  const allFields = new Set([...Object.keys(oldSnapshot), ...Object.keys(newSnapshot)]);
  
  for (const field of allFields) {
    const oldVal = oldSnapshot[field];
    const newVal = newSnapshot[field];
    
    if (oldVal === null || oldVal === undefined) {
      if (newVal !== null && newVal !== undefined && !(Array.isArray(newVal) && newVal.length === 0)) {
        diffs.push({ field, displayField: DISPLAY_FIELDS[field] ?? field, type: "added", newValue: newVal });
      }
    } else if (newVal === null || newVal === undefined) {
      diffs.push({ field, displayField: DISPLAY_FIELDS[field] ?? field, type: "removed", oldValue: oldVal });
    } else {
      // Check for array changes
      if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        const added = newVal.filter((v) => !oldVal.includes(v));
        const removed = oldVal.filter((v) => !newVal.includes(v));
        if (added.length > 0 || removed.length > 0) {
          diffs.push({ field, displayField: DISPLAY_FIELDS[field] ?? field, type: "changed", oldValue: oldVal, newValue: newVal, arrayChanges: { added, removed } });
        }
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({ field, displayField: DISPLAY_FIELDS[field] ?? field, type: "changed", oldValue: oldVal, newValue: newVal });
      }
    }
  }
  
  return diffs;
}

interface VersionEntry {
  id: string;
  snapshot: unknown;
  changeReason: string | null;
  createdAt: string;
}

export function BrandContextHistory() {
  const router = useRouter();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const [checkpointDialogOpen, setCheckpointDialogOpen] = useState(false);
  const [checkpointReason, setCheckpointReason] = useState("");
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);

  async function reloadHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/history");
      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }
      const json = await res.json();
      setVersions(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect -- safe: only fires on mount, setState is in async function */
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/brand-context/history", { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }
        const json = await res.json();
        if (!cancelled) setVersions(json.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCreateCheckpoint() {
    setSavingCheckpoint(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeReason: checkpointReason || "manual_checkpoint" }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to create checkpoint");
      }
      toast.success("Checkpoint created", {
        description: "A snapshot of your current brand context has been saved.",
      });
      setCheckpointDialogOpen(false);
      setCheckpointReason("");
      router.refresh();
      await reloadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkpoint");
    } finally {
      setSavingCheckpoint(false);
    }
  }

  async function handleRestore(versionId: string) {
    setRestoring(versionId);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to restore");
      }
      toast.success("Brand context restored", {
        description: "Previous version has been applied.",
      });
      router.refresh();
      await reloadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setRestoring(null);
    }
  }

  function formatReason(reason: string | null): string {
    switch (reason) {
      case "initial_analysis": return "Initial analysis";
      case "manual_edit": return "Manual edit";
      case "learning_applied": return "Learning applied";
      case "re_analysis": return "Re-analysis";
      case "import": return "Import";
      case "restore_checkpoint": return "Restore checkpoint";
      default: return reason ?? "Unknown";
    }
  }

  if (loading) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Clock className="size-5 text-muted-foreground" />
            Version History
          </CardTitle>
          <CardDescription>Loading history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0 && !error) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Clock className="size-5 text-muted-foreground" />
            Version History
          </CardTitle>
          <CardDescription>
            No previous versions yet. Snapshots are created when you edit, re-analyze, or apply learning suggestions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm">
      <Accordion type="single" collapsible defaultValue="history">
        <AccordionItem value="history" className="border-0">
          <AccordionTrigger className="px-6">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium tracking-tight">Version History</span>
              <Badge variant="secondary" className="text-xs ml-2 rounded-sm">
                {versions.length} versions
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="px-6 pb-6 space-y-3">
              {error && (
                <Alert variant="destructive">
                  <Warning className="size-4" weight="fill" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions found.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {versions.map((version, idx) => {
                    const nextIdx = idx < versions.length - 1 ? idx + 1 : null;
                    const nextVersion = nextIdx !== null ? versions[nextIdx] : null;
                    const diffs = nextVersion ? computeDiff(nextVersion.snapshot as Record<string, unknown>, version.snapshot as Record<string, unknown>) : [];
                    const isDiffExpanded = expandedDiffId === version.id;

                    return (
                      <div key={version.id}>
                        <div className="flex items-start justify-between gap-3 rounded-sm border bg-card p-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {idx === 0 ? "Current version" : `Version ${versions.length - idx}`}
                              </span>
                              <Badge variant="outline" className="text-xs normal-case">
                                {formatReason(version.changeReason)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(version.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {idx !== 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedDiffId(isDiffExpanded ? null : version.id)}
                                className="gap-1.5 min-h-10"
                              >
                                {isDiffExpanded ? <X className="size-3.5" /> : <Eye className="size-3.5" />}
                                {isDiffExpanded ? "Close" : "Changes"}
                              </Button>
                            )}
                            {idx !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(version.id)}
                                disabled={restoring === version.id}
                                className="gap-1.5 min-h-10"
                              >
                                <ArrowCounterClockwise className={`size-3.5 ${restoring === version.id ? "animate-spin" : ""}`} />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>

                        {isDiffExpanded && diffs.length > 0 && (
                          <div className="mt-1 mb-2 space-y-2 border-t border-border/50 pt-3 pl-2 pr-2">
                            {diffs.map((diff) => (
                              <div key={diff.field} className="flex items-start gap-3">
                                <span className="text-xs font-medium min-w-[120px] text-muted-foreground">
                                  {diff.displayField}
                                </span>
                                <div className="flex flex-wrap gap-2 flex-1">
                                  {diff.type === "added" && (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs normal-case">
                                      + Added: {formatFieldValue(diff.newValue)}
                                    </Badge>
                                  )}
                                  {diff.type === "removed" && (
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs normal-case">
                                      - Removed: {formatFieldValue(diff.oldValue)}
                                    </Badge>
                                  )}
                                  {diff.type === "changed" && (
                                    <div className="flex flex-col gap-1 w-full">
                                      {diff.arrayChanges ? (
                                        <>
                                          {diff.arrayChanges.added.length > 0 && (
                                            <div className="flex flex-wrap gap-1 items-center">
                                              <span className="text-xs text-success">+ Added:</span>
                                              {diff.arrayChanges.added.map((v, i) => (
                                                <Badge key={i} variant="outline" className="bg-success/10 text-success border-success/20 text-xs normal-case">
                                                  {String(v)}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                          {diff.arrayChanges.removed.length > 0 && (
                                            <div className="flex flex-wrap gap-1 items-center">
                                              <span className="text-xs text-destructive">- Removed:</span>
                                              {diff.arrayChanges.removed.map((v, i) => (
                                                <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs normal-case">
                                                  {String(v)}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="text-xs normal-case">
                                            {formatFieldValue(diff.oldValue)}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">→</span>
                                          <Badge variant="outline" className="text-xs normal-case">
                                            {formatFieldValue(diff.newValue)}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
