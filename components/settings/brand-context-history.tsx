"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, ArrowCounterClockwise, Warning } from "@phosphor-icons/react/ssr";

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

  const fetchHistory = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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
      fetchHistory();
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
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
    <Card>
      <Accordion type="single" collapsible defaultValue="history">
        <AccordionItem value="history" className="border-0">
          <AccordionTrigger className="px-6">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Version History</span>
              <Badge variant="secondary" className="text-xs ml-2">
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
                  {versions.map((version, idx) => (
                    <div
                      key={version.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
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
                  ))}
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
