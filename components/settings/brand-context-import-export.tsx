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
}

export function BrandContextImportExport({ brandContext }: BrandContextImportExportProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingPayload, setPendingPayload] = useState<unknown>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/brand-context/export");
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export failed");
      }
      const json = await res.json();
      const fileName = `brand-context-${brandContext?.businessName || "export"}-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Brand context exported", { description: fileName });
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setExporting(false);
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
          onClick={handleExport}
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

      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) { setImportDialogOpen(false); setPreview(null); setPendingPayload(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-brand" weight="fill" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              Review the data that will be imported. This will overwrite your current brand profile.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Import Preview</CardTitle>
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

          <Alert variant="destructive" className="mt-2">
            <Warning className="size-4" weight="fill" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will overwrite your current brand context data. Consider exporting a backup first.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setPreview(null); setPendingPayload(null); }}>
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
