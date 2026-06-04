"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  MagnifyingGlass,
  Plus,
  X,
  ImageSquare,
  Smiley,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaGrid } from "./media-grid";
import { UploadDialog } from "./upload-dialog";
import { StockPhotoBrowser } from "./stock-photo-browser";
import { GifBrowser } from "./gif-browser";
import type { MediaAsset } from "@/lib/media/types";
import { toast } from "sonner";

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets?: MediaAsset[];
  onSelect?: (assets: MediaAsset[]) => void;
  brandSearchQuery?: string;
}

export function MediaPicker({ open, onOpenChange, selectedAssets = [], onSelect, brandSearchQuery }: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickerTab, setPickerTab] = useState<"upload" | "stock" | "gifs">("upload");
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const reloadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("take", "50");
      const q = searchRef.current;
      if (q) params.set("q", q);
      const response = await fetch(`/api/media?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch assets");
      const data = await response.json();
      setAssets(data.data?.assets ?? []);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("take", "50");
        const q = searchRef.current;
        if (q) params.set("q", q);
        const response = await fetch(`/api/media?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch assets");
        const data = await response.json();
        if (!cancelled) setAssets(data.data?.assets ?? []);
      } catch {
        toast.error("Failed to load media");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => reloadAssets(), 300);
    return () => clearTimeout(id);
  }, [search, open, reloadAssets]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIds(new Set(selectedAssets.map((a) => a.id)));
    }
  }, [open, selectedAssets]);

  const handleSelect = (asset: MediaAsset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = assets.filter((a) => selectedIds.has(a.id));
    onSelect?.(selected);
    onOpenChange(false);
  };

  const handleUploadComplete = () => {
    reloadAssets();
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (response.ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        reloadAssets();
      }
    } catch {
      // Silent fail
    }
  };

  const handleStockImportComplete = () => {
    reloadAssets();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Media</DialogTitle>
            <DialogDescription>
              Choose images from your library or browse stock photos and GIFs.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as "upload" | "stock" | "gifs")} className="w-full">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5 text-xs">
                <ImageSquare className="size-3.5" />
                Library
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex-1 gap-1.5 text-xs">
                <MagnifyingGlass className="size-3.5" />
                Stock Photos
              </TabsTrigger>
              <TabsTrigger value="gifs" className="flex-1 gap-1.5 text-xs">
                <Smiley className="size-3.5" />
                GIFs
              </TabsTrigger>
            </TabsList>

            {/* Library tab */}
            <TabsContent value="upload" className="mt-4 space-y-3">
              {/* Search + Upload */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search media..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Upload
                </Button>
              </div>

              {/* Selected badges */}
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Selected:</span>
                  {Array.from(selectedIds).map((id) => {
                    const asset = assets.find((a) => a.id === id);
                    if (!asset) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 text-xs normal-case">
                        {asset.originalName.slice(0, 20)}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            })
                          }
                          className="ml-1 hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-sm border border-border overflow-hidden">
                      <Skeleton className="aspect-square w-full rounded-none" />
                      <div className="p-2 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-empty text-center">
                  <Image className="mb-3 size-10 text-muted-foreground" weight="thin" />
                  <p className="mb-1 text-sm font-medium text-foreground">No media yet</p>
                  <p className="mb-4 text-xs text-muted-foreground">Upload images to get started.</p>
                  <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Upload Media
                  </Button>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <MediaGrid
                    assets={assets}
                    onSelect={handleSelect}
                    selectedIds={selectedIds}
                    onDelete={handleDeleteAsset}
                    showActions={false}
                  />
                </div>
              )}
            </TabsContent>

            {/* Stock Photos tab */}
            <TabsContent value="stock" className="mt-4">
              <StockPhotoBrowser
                defaultProvider="all"
                onImportComplete={handleStockImportComplete}
                initialQuery={brandSearchQuery}
              />
            </TabsContent>

            {/* GIFs tab */}
            <TabsContent value="gifs" className="mt-4">
              <GifBrowser onImportComplete={handleStockImportComplete} />
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
              Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
        brandSearchQuery={brandSearchQuery}
      />
    </>
  );
}
