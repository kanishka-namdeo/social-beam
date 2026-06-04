"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ArrowCounterClockwise,
  CloudArrowUp,
  Image,
  X,
  Check,
  Warning,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StockPhotoBrowser } from "./stock-photo-browser";
import { GifBrowser } from "./gif-browser";

interface UploadState {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  brandSearchQuery?: string;
}

export function UploadDialog({ open, onOpenChange, onComplete, brandSearchQuery }: UploadDialogProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceTab, setSourceTab] = useState("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploads.some((u) => u.status === "uploading");
  const mountedRef = useRef(true);
  const nextIndexRef = useRef(0);
  const progressIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track mount status to prevent setState after unmount
  useEffect(() => {
    mountedRef.current = true;
    abortControllerRef.current = new AbortController();
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const interval of progressIntervalsRef.current.values()) {
        clearInterval(interval);
      }
      progressIntervalsRef.current.clear();
    };
  }, []);

  // Reset index counter when dialog opens
  useEffect(() => {
    if (open) {
      setUploads([]);
      nextIndexRef.current = 0;
    }
  }, [open]);

  // Reset source tab when dialog opens
  useEffect(() => {
    if (open) {
      setSourceTab("upload");
    }
  }, [open]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newUploads: UploadState[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));

    const startIndex = nextIndexRef.current;
    nextIndexRef.current += files.length;

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach((upload, index) => {
      uploadFile(upload.file, startIndex + index);
    });
  }, []);

  const uploadFile = async (file: File, index: number) => {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "uploading", progress: 10 } : u)),
    );

    try {
      const formData = new FormData();
      formData.append("files", file);

      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index && u.status === "uploading" && u.progress < 90
              ? { ...u, progress: u.progress + 10 }
              : u,
          ),
        );
      }, 200);
      progressIntervalsRef.current.set(index, progressInterval);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      clearInterval(progressInterval);
      progressIntervalsRef.current.delete(index);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }

      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, status: "success", progress: 100 } : u)),
      );
    } catch (error) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? { ...u, status: "error", progress: 0, error: error instanceof Error ? error.message : "Upload failed" }
            : u,
        ),
      );
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploads([]);
      onOpenChange(false);
      if (onComplete) onComplete();
    }
  };

  const handleImportComplete = () => {
    handleClose();
  };

  const successfulUploads = uploads.filter((u) => u.status === "success").length;
  const failedUploads = uploads.filter((u) => u.status === "error").length;
  const allComplete = uploads.length > 0 && uploads.every((u) => u.status === "success" || u.status === "error");

  // Show completion toast when all uploads finish
  const prevCompleteRef = useRef(false);
  useEffect(() => {
    if (allComplete && uploads.length > 0 && !prevCompleteRef.current) {
      prevCompleteRef.current = true;
      if (successfulUploads > 0 && failedUploads === 0) {
        toast.success(`${successfulUploads} file${successfulUploads > 1 ? "s" : ""} uploaded`, {
          description: "Media added to your library.",
        });
      } else if (successfulUploads > 0 && failedUploads > 0) {
        toast.warning(`${successfulUploads}/${uploads.length} files uploaded`, {
          description: `${failedUploads} file${failedUploads > 1 ? "s" : ""} failed to upload.`,
        });
      } else if (failedUploads === uploads.length) {
        toast.error("All uploads failed", {
          description: "Check file formats and sizes, then try again.",
        });
      }
    }
    if (!allComplete) {
      prevCompleteRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComplete]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Media</DialogTitle>
          <DialogDescription>
            Upload from your computer or browse stock photos and GIFs.
          </DialogDescription>
        </DialogHeader>

        {/* Source tabs */}
        <Tabs value={sourceTab} onValueChange={setSourceTab}>
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="upload" className="flex-1 text-xs">Upload</TabsTrigger>
            <TabsTrigger value="unsplash" className="flex-1 text-xs">Unsplash</TabsTrigger>
            <TabsTrigger value="pexels" className="flex-1 text-xs">Pexels</TabsTrigger>
            <TabsTrigger value="giphy" className="flex-1 text-xs">GIPHY</TabsTrigger>
          </TabsList>

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-sm border-2 border-dashed p-empty transition-colors",
                isDragging
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-muted-foreground/50",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CloudArrowUp className="mb-3 size-10 text-muted-foreground" weight="thin" />
              <p className="mb-1 text-sm font-medium text-foreground">
                {isDragging ? "Drop files here" : "Drag and drop files here"}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">or</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Image className="mr-1.5 size-4" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={handleFileInput}
                disabled={isUploading}
              />
            </div>

            {/* Upload list */}
            {uploads.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {uploads.length} file{uploads.length !== 1 ? "s" : ""}
                  </span>
                  {allComplete && (
                    <span className="text-xs text-muted-foreground">
                      {successfulUploads}/{uploads.length} uploaded
                    </span>
                  )}
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {uploads.map((upload, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-sm border border-border bg-muted/50 p-2"
                    >
                      <div className="shrink-0">
                        {upload.status === "pending" && (
                          <ArrowCounterClockwise className="size-4 animate-spin text-muted-foreground" />
                        )}
                        {upload.status === "uploading" && (
                          <ArrowCounterClockwise className="size-4 animate-spin text-brand" />
                        )}
                        {upload.status === "success" && (
                          <Check className="size-4 text-success" weight="bold" />
                        )}
                        {upload.status === "error" && (
                          <Warning className="size-4 text-destructive" weight="bold" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {upload.file.name}
                        </p>
                        <p className="text-micro text-muted-foreground">
                          {(upload.file.size / 1024).toFixed(0)} KB
                        </p>
                        {upload.status === "uploading" && (
                          <Progress value={upload.progress} className="mt-1 h-1" />
                        )}
                        {upload.status === "error" && (
                          <p className="text-micro text-destructive">{upload.error}</p>
                        )}
                      </div>

                      {upload.status !== "uploading" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          onClick={() => removeUpload(index)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Unsplash tab */}
          <TabsContent value="unsplash" className="mt-4">
            <StockPhotoBrowser
              defaultProvider="unsplash"
              hideProviderSwitcher
              onImportComplete={handleImportComplete}
              initialQuery={brandSearchQuery}
            />
          </TabsContent>

          {/* Pexels tab */}
          <TabsContent value="pexels" className="mt-4">
            <StockPhotoBrowser
              defaultProvider="pexels"
              hideProviderSwitcher
              onImportComplete={handleImportComplete}
              initialQuery={brandSearchQuery}
            />
          </TabsContent>

          {/* GIPHY tab */}
          <TabsContent value="giphy" className="mt-4">
            <GifBrowser onImportComplete={handleImportComplete} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
