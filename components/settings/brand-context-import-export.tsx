"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadSimple, UploadSimple, CheckCircle, Warning } from "@phosphor-icons/react/ssr";

interface BrandContextImportExportProps {
  brandContext: { id: string; businessName: string | null } | null;
}

interface ImportPreview {
  businessName: string | null;
  industry: string | null;
  tonePreset: string | null;
  platformCount: number;
  fieldCount: number;
  payload: Record<string, unknown>;
}

interface CurrentContext {
  businessName: string | null;
  tagline: string | null;
  websiteUrl: string | null;
  industry: string | null;
  productDesc: string | null;
  tonePreset: string | null;
  voiceDescription: string | null;
  bannedWords: string[];
  audienceType: string | null;
  interests: string[];
  painPoints: string[];
  competitors: string[];
  goals: string[];
  trainingStatus: string;
}

type ExportSection = "brandIdentity" | "voice" | "audience" | "goals" | "platformContexts";

const EXPORT_OPTIONS: { key: ExportSection; label: string; description: string }[] = [
  { key: "brandIdentity", label: "Brand Identity & Voice", description: "Name, tagline, website, industry, product desc, tone" },
  { key: "voice", label: "Voice Configuration", description: "Banned words, voice description, examples" },
  { key: "audience", label: "Audience Profile", description: "Audience type, demographics, interests, pain points, competitors" },
  { key: "goals", label: "Business Goals", description: "Goal tags and training status" },
  { key: "platformContexts", label: "Platform-specific Settings", description: "Per-platform tone, cadence, rules, hashtag strategy" },
];

const DIFF_FIELDS: Array<keyof CurrentContext> = [
  "businessName", "tagline", "websiteUrl", "industry", "productDesc",
  "tonePreset", "voiceDescription", "bannedWords", "audienceType",
  "interests", "painPoints", "competitors", "goals",
];

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length === 0 ? "empty" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getIncomingFieldValue(key: string, payload: Record<string, unknown>): unknown {
  const bc = payload.brandContext as Record<string, unknown> | undefined;
  if (!bc) return null;
  const val = bc[key];
  if (val === null || val === undefined) return null;
  return val;
}

export function BrandContextImportExport({ brandContext }: BrandContextImportExportProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingPayload, setPendingPayload] = useState<unknown>(null);
  const [currentContext, setCurrentContext] = useState<CurrentContext | null>(null);

  // Partial export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSelection, setExportSelection] = useState<Record<ExportSection, boolean>>({
    brandIdentity: true,
    voice: true,
    audience: true,
    goals: true,
    platformContexts: true,
  });
  const [pendingExportData, setPendingExportData] = useState<unknown>(null);

  async function handleExportStart() {
    setExporting(true);
    try {
      const res = await fetch("/api/brand-context/export");
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export failed");
      }
      const json = await res.json();
      setPendingExportData(json.data);
      setExportDialogOpen(true);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setExporting(false);
    }
  }

  function buildPartialExport(data: unknown, selection: Record<ExportSection, boolean>): unknown {
    const full = data as Record<string, unknown>;
    const bc = (full.brandContext ?? {}) as Record<string, unknown>;
    const platforms = full.platformContexts ?? [];

    const partialBc: Record<string, unknown> = {};
    if (selection.brandIdentity) {
      ["businessName", "tagline", "websiteUrl", "industry", "productDesc"].forEach((k) => {
        if (bc[k] !== undefined) partialBc[k] = bc[k];
      });
    }
    if (selection.voice) {
      ["tonePreset", "voiceDescription", "bannedWords", "voiceExamples"].forEach((k) => {
        if (bc[k] !== undefined) partialBc[k] = bc[k];
      });
    }
    if (selection.audience) {
      ["audienceType", "demographics", "interests", "painPoints", "competitors"].forEach((k) => {
        if (bc[k] !== undefined) partialBc[k] = bc[k];
      });
    }
    if (selection.goals) {
      ["goals", "trainingStatus"].forEach((k) => {
        if (bc[k] !== undefined) partialBc[k] = bc[k];
      });
    }

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      ...(Object.keys(partialBc).length > 0 ? { brandContext: partialBc } : {}),
      ...(selection.platformContexts && Array.isArray(platforms) && (platforms as unknown[]).length > 0 ? { platformContexts: platforms } : {}),
    };
  }

  async function handleExportConfirm() {
    if (!pendingExportData) return;
    try {
      const exportData = buildPartialExport(pendingExportData, exportSelection);
      const fileName = `brand-context-${brandContext?.businessName || "export"}-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Brand context exported", { description: fileName });
      setExportDialogOpen(false);
      setPendingExportData(null);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  function parseImportData(text: string): { ok: boolean; payload?: unknown; preview?: ImportPreview } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false };
    }

    const obj = parsed as Record<string, unknown>;
    if (!obj.brandContext && !obj.version) {
      return { ok: false };
    }

    const bc = obj.brandContext as Record<string, unknown> | undefined;
    const platforms = (obj.platformContexts as unknown[] | undefined) ?? [];

    let fieldCount = 0;
    if (bc) {
      for (const val of Object.values(bc)) {
        if (val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0)) {
          fieldCount++;
        }
      }
    }

    return {
      ok: true,
      payload: parsed,
      preview: {
        businessName: (bc?.businessName as string) ?? null,
        industry: (bc?.industry as string) ?? null,
        tonePreset: (bc?.tonePreset as string) ?? null,
        platformCount: platforms.length,
        fieldCount,
        payload: parsed as Record<string, unknown>,
      },
    };
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file", { description: "Please select a .json file" });
      return;
    }

    const text = await file.text();
    const result = parseImportData(text);
    if (!result.ok) {
      toast.error("Invalid import file", { description: "File does not match the expected brand context export format" });
      return;
    }

    setPreview(result.preview!);
    setPendingPayload(result.payload!);

    // Fetch current context for diff comparison
    try {
      const res = await fetch("/api/brand-context");
      const json = await res.json();
      setCurrentContext(json.data);
    } catch {
      setCurrentContext(null);
    }

    setImportDialogOpen(true);
  }

  async function handleConfirmImport() {
    if (!pendingPayload) return;
    setImporting(true);
    try {
      const res = await fetch("/api/brand-context/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingPayload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Import failed");
      }
      toast.success("Brand context imported", { description: "Profile has been updated with imported data" });
      setImportDialogOpen(false);
      setPreview(null);
      setPendingPayload(null);
      setCurrentContext(null);
      router.refresh();
    } catch (err) {
      toast.error("Import failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setImporting(false);
    }
  }

  if (!brandContext) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Warning className="size-3.5" />
        Configure brand context first to enable import/export
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportStart}
          disabled={exporting}
          className="gap-1.5 min-h-10"
        >
          <DownloadSimple className={cn("size-4", exporting && "animate-spin")} />
          {exporting ? "Exporting..." : "Export"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (e) => void handleFileSelect(e as unknown as React.ChangeEvent<HTMLInputElement>);
            input.click();
          }}
          disabled={importing}
          className="gap-1.5 min-h-10"
        >
          <UploadSimple className="size-4" />
          Import
        </Button>
      </div>

      {/* Export Options Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(open) => { if (!open) { setExportDialogOpen(false); setPendingExportData(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DownloadSimple className="size-5 text-brand" weight="fill" />
              Export Brand Context
            </DialogTitle>
            <DialogDescription>
              Choose what to include in the export file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {EXPORT_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all">
                  {exportSelection[opt.key] && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExportSelection((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  className="text-left"
                >
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </button>
              </label>
            ))}
            <button
              type="button"
              onClick={() => {
                const allChecked = Object.values(exportSelection).every(Boolean);
                setExportSelection({
                  brandIdentity: !allChecked,
                  voice: !allChecked,
                  audience: !allChecked,
                  goals: !allChecked,
                  platformContexts: !allChecked,
                });
              }}
              className="text-xs text-brand underline underline-offset-2"
            >
              {Object.values(exportSelection).every(Boolean) ? "Deselect all" : "Select all"}
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExportDialogOpen(false); setPendingExportData(null); }}>Cancel</Button>
            <Button onClick={handleExportConfirm} disabled={!pendingExportData}>
              <DownloadSimple className="size-4 mr-1.5" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog with Field Diff */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) { setImportDialogOpen(false); setPreview(null); setPendingPayload(null); setCurrentContext(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-brand" weight="fill" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              Review the data that will be imported. This will overwrite your current brand profile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3">
            {preview && (
              <Card className="border-border rounded-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm tracking-tight">Import Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Brand</span>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {preview.businessName || "Unnamed"}
                    </Badge>
                  </div>
                  {preview.industry && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Industry</span>
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {preview.industry}
                      </Badge>
                    </div>
                  )}
                  {preview.tonePreset && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Tone</span>
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {preview.tonePreset}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="size-3.5" weight="fill" />
                      {preview.fieldCount} fields
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="size-3.5" weight="fill" />
                      {preview.platformCount} platform{preview.platformCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Field-by-field diff */}
            {preview && currentContext && (
              <Card className="border-border rounded-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm tracking-tight">Field Changes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {DIFF_FIELDS.map((field) => {
                    const currentValue = currentContext[field];
                    const incomingValue = getIncomingFieldValue(field, preview.payload);
                    const hasChange = JSON.stringify(currentValue) !== JSON.stringify(incomingValue);

                    if (!hasChange) return null;

                    const isArray = Array.isArray(currentValue) || Array.isArray(incomingValue);

                    return (
                      <div key={field} className="flex items-start gap-3 text-sm">
                        <span className="min-w-[100px] text-xs font-medium text-muted-foreground capitalize">
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {isArray ? (
                            <div className="flex flex-col gap-1 w-full">
                              {Array.isArray(currentValue) && Array.isArray(incomingValue) && (
                                <>
                                  {incomingValue.filter((v) => !currentValue.includes(v)).length > 0 && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      <span className="text-xs text-success">+ Add:</span>
                                      {incomingValue.filter((v) => !currentValue.includes(v)).map((v, i) => (
                                        <Badge key={i} variant="outline" className="bg-success/10 text-success border-success/20 text-xs normal-case">
                                          {String(v)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {currentValue.filter((v) => !incomingValue.includes(v)).length > 0 && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      <span className="text-xs text-destructive">- Remove:</span>
                                      {currentValue.filter((v) => !incomingValue.includes(v)).map((v, i) => (
                                        <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs normal-case">
                                          {String(v)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              {!Array.isArray(currentValue) && Array.isArray(incomingValue) && (
                                <Badge variant="outline" className="text-xs normal-case">
                                  {formatFieldValue(incomingValue)}
                                </Badge>
                              )}
                              {Array.isArray(currentValue) && !Array.isArray(incomingValue) && (
                                <Badge variant="secondary" className="text-xs normal-case">
                                  {formatFieldValue(currentValue)}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs normal-case line-through opacity-60">
                                {formatFieldValue(currentValue)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                              <Badge variant="outline" className="text-xs normal-case">
                                {formatFieldValue(incomingValue)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {DIFF_FIELDS.every((field) => JSON.stringify(currentContext[field]) === JSON.stringify(getIncomingFieldValue(field, preview.payload))) && (
                    <p className="text-xs text-muted-foreground text-center py-2">No field-level changes detected. All values will be overwritten.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {preview && !currentContext && (
              <p className="text-xs text-muted-foreground text-center">Unable to fetch current context for comparison.</p>
            )}
          </div>

          <Alert variant="warning" className="mt-2 flex-shrink-0">
            <Warning className="size-4" weight="fill" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will overwrite your current brand context data. Consider exporting a backup first.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setPreview(null); setPendingPayload(null); setCurrentContext(null); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? (
                <>
                  <Warning className="size-3.5 mr-1.5 animate-pulse" weight="fill" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="size-3.5 mr-1.5" weight="fill" />
                  Confirm Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
