"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadSimple,
  FileCsv,
  Warning,
  CheckCircle,
  X,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface ParsedPost {
  date: string;
  time: string;
  content: string;
  platforms: string[];
  title?: string;
  scheduledAt: string;
}

interface ParseError {
  row: number;
  message: string;
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onSuccess }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [valid, setValid] = useState<ParsedPost[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setCsvText("");
    setValid([]);
    setErrors([]);
    setParsing(false);
    setImporting(false);
    setParsed(false);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const readFile = async (f: File) => {
    setFile(f);
    setParsed(false);
    setParsing(true);
    setValid([]);
    setErrors([]);

    try {
      const text = await f.text();
      setCsvText(text);

      const res = await fetch("/api/calendar/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setValid(data.valid || []);
        setErrors(data.errors || []);
        setParsed(true);
      } else {
        notifyErrorWithCategory("Failed to parse CSV", { category: "system" });
      }
    } catch (error) {
      console.error("Failed to read CSV:", error);
      notifyErrorWithCategory("Failed to read file", { category: "system" });
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void readFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void readFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImport = async () => {
    if (!csvText || valid.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/calendar/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, confirm: true }),
      });

      if (res.ok) {
        const data = await res.json();
        notifySuccessWithCategory(
          `${data.created} post${data.created !== 1 ? "s" : ""} imported`,
          { category: "post_publish" }
        );
        handleOpenChange(false);
        onSuccess();
      } else {
        throw new Error("Import failed");
      }
    } catch (error) {
      console.error("CSV import failed:", error);
      notifyErrorWithCategory("Import failed", { category: "post_publish" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCsv className="size-5 text-brand" weight="fill" />
            Import CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: date, time, content, platforms, title (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop zone */}
          {!parsed && !parsing && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors",
                dragOver
                  ? "border-brand bg-brand/5"
                  : "border-border hover:bg-accent/30"
              )}
            >
              <UploadSimple
                className={cn("size-10", dragOver ? "text-brand" : "text-muted-foreground/50")}
                weight="thin"
              />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: date, time, content, platforms, title
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Loading state */}
          {parsing && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {/* Results */}
          {parsed && (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 text-sm">
                {valid.length > 0 && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle className="size-4" weight="fill" />
                    {valid.length} valid row{valid.length !== 1 ? "s" : ""}
                  </span>
                )}
                {errors.length > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <Warning className="size-4" weight="fill" />
                    {errors.length} error row{errors.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Valid rows preview */}
              {valid.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Platforms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valid.map((post, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">{post.date}</TableCell>
                          <TableCell className="whitespace-nowrap">{post.time}</TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {post.title || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{post.content}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {post.platforms.map((p) => (
                                <Badge key={p} variant="outline" className="text-xs capitalize">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Error rows */}
              {errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-destructive/5">
                        <TableHead className="text-destructive">Row</TableHead>
                        <TableHead className="text-destructive">Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.map((err, i) => (
                        <TableRow key={i} className="bg-destructive/5">
                          <TableCell className="text-destructive font-mono">{err.row}</TableCell>
                          <TableCell className="text-destructive">{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Re-upload */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  reset();
                }}
              >
                <X className="size-3.5" weight="bold" />
                Choose different file
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && valid.length > 0 && (
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${valid.length} Post${valid.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
