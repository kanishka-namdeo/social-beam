"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  GridFour,
  ListDashes,
  MagnifyingGlass,
  Plus,
  Trash,
  ImageSquare,
  Smiley,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MediaGrid } from "./media-grid";
import { UploadDialog } from "./upload-dialog";
import { PlatformDimensionHints } from "./platform-dimension-hints";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StockPhotoBrowser } from "./stock-photo-browser";
import { GifBrowser } from "./gif-browser";
import { toast } from "sonner";
import type { MediaAsset } from "@/lib/media/types";

interface MediaLibraryProps {
  initialAssets: MediaAsset[];
  total: number;
  connectedPlatforms?: string[];
  brandSearchQuery?: string;
}

export function MediaLibrary({ initialAssets, total: initialTotal, connectedPlatforms = [], brandSearchQuery }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"upload" | "stock" | "gifs">("upload");
  const [showArchived, setShowArchived] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const filteredAssets = showArchived ? assets : assets.filter((a) => a.status !== "archived");

  const fetchAssets = useCallback(async (searchValue?: string) => {
    // Cancel any in-flight fetch so stale responses can't overwrite newer state.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const query = searchValue !== undefined ? searchValue : search;

    try {
      const params = new URLSearchParams();
      params.set("take", "50");
      if (query) params.set("search", query);

      setSearchLoading(true);
      const response = await fetch(`/api/media?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Failed to fetch assets");

      const data = await response.json();
      if (controller.signal.aborted) return;
      setAssets(data.data?.assets ?? []);
      setTotal(data.data?.total ?? assets.length);
      setHasSearched(!!query);
    } catch (err) {
      if (controller.signal.aborted) return;
      // Silent fail
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }, [search]);

  const handleUploadComplete = () => {
    fetchAssets();
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (response.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        toast.success("Asset deleted");
      }
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
        setTotal((prev) => Math.max(0, prev - selectedIds.size));
        setSelectedIds(new Set());
        toast.success(`${selectedIds.size} asset${selectedIds.size > 1 ? "s" : ""} deleted`);
      }
    } catch {
      toast.error("Failed to delete assets");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleAssetUpdate = (updatedAsset: MediaAsset) => {
    setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch("/api/media/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: "archived" }),
      });

      if (response.ok) {
        setAssets((prev) => prev.map((a) => selectedIds.has(a.id) ? { ...a, status: "archived" as const } : a));
        setSelectedIds(new Set());
        toast.success(`${selectedIds.size} asset${selectedIds.size > 1 ? "s" : ""} archived`);
      } else {
        throw new Error("Failed to archive");
      }
    } catch {
      toast.error("Failed to archive assets");
    }
  };

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

  // Debounced search to avoid excessive API calls
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setHasSearched(false);
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Set new timeout - pass the new value directly to avoid stale closure
    searchTimeoutRef.current = setTimeout(() => fetchAssets(value), 300);
  };

  // Cleanup search timeout and abort in-flight fetch on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="stagger-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            {total} asset{total !== 1 ? "s" : ""} in your library
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
              >
                <Archive className="mr-1.5 size-4" />
                Archive ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash className="mr-1.5 size-4" />
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
          {libraryTab === "upload" && (
            <>
              <div className="flex items-center gap-2 mr-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">
                  Show archived
                </label>
              </div>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Top-level library tabs */}
      <Tabs value={libraryTab} onValueChange={(v) => setLibraryTab(v as "upload" | "stock" | "gifs")}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-1.5 text-xs">
            <ImageSquare className="size-3.5" />
            Upload
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

        {/* Upload tab */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          {/* Search + view mode */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or tag..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
              <TabsList variant="line" className="h-8 shrink-0">
                <TabsTrigger value="grid" className="gap-1 px-2">
                  <GridFour className="size-3.5" />
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1 px-2">
                  <ListDashes className="size-3.5" />
                </TabsTrigger>
              </TabsList>

              {/* Grid content */}
              <TabsContent value="grid" className="mt-0">
                {searchLoading ? (
                  <div className="grid-auto-fill gap-4">
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
                ) : assets.length === 0 && search && hasSearched ? (
                  <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-empty text-center">
                    <MagnifyingGlass className="mb-3 size-10 text-muted-foreground" weight="thin" />
                    <p className="mb-1 text-sm font-medium text-foreground">
                      No results found for &quot;{search}&quot;
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Try a different search term or clear the filter.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setSearch(""); setHasSearched(false); }}>
                      Clear Search
                    </Button>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-empty text-center">
                    <GridFour className="mb-3 size-10 text-muted-foreground" weight="thin" />
                    <p className="mb-1 text-sm font-medium text-foreground">No media yet</p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Upload images or browse stock photos to build your library.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                        <Plus className="mr-1.5 size-4" />
                        Upload Media
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MediaGrid
                    assets={filteredAssets}
                    onSelect={viewMode === "grid" ? handleSelect : undefined}
                    selectedIds={selectedIds}
                    onDelete={handleDeleteAsset}
                    onAssetUpdate={handleAssetUpdate}
                  />
                )}
              </TabsContent>

              {/* List content */}
              <TabsContent value="list" className="mt-0">
                <PlatformDimensionHints connectedPlatforms={connectedPlatforms} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Stock Photos tab */}
        <TabsContent value="stock" className="mt-4">
          <StockPhotoBrowser
            defaultProvider="all"
            onImportComplete={fetchAssets}
            initialQuery={brandSearchQuery}
          />
        </TabsContent>

        {/* GIFs tab */}
        <TabsContent value="gifs" className="mt-4">
          <GifBrowser onImportComplete={fetchAssets} />
        </TabsContent>
      </Tabs>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
        brandSearchQuery={brandSearchQuery}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete assets"
        description={`Are you sure you want to delete ${selectedIds.size} asset${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
