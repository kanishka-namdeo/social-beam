"use client";

import { useCallback, useState } from "react";
import {
  GridFour,
  ListDashes,
  MagnifyingGlass,
  Plus,
  Trash,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaGrid } from "./media-grid";
import { UploadDialog } from "./upload-dialog";
import { PlatformDimensionHints } from "./platform-dimension-hints";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface MediaAsset {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  publicUrl: string;
  status: string;
  tags: string[];
  createdAt: Date;
}

interface MediaLibraryProps {
  initialAssets: MediaAsset[];
  total: number;
  connectedPlatforms?: string[];
}

export function MediaLibrary({ initialAssets, total, connectedPlatforms = [] }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("take", "50");
      if (search) params.set("search", search);

      setSearchLoading(true);
      const response = await fetch(`/api/media?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch assets");

      const data = await response.json();
      setAssets(data.data?.assets ?? []);
      setHasSearched(!!search);
    } catch {
      // Silent fail
    } finally {
      setSearchLoading(false);
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
        setSelectedIds(new Set());
        toast.success(`${selectedIds.size} asset${selectedIds.size > 1 ? "s" : ""} deleted`);
      }
    } catch {
      toast.error("Failed to delete assets");
    } finally {
      setDeleteDialogOpen(false);
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
    setTimeout(() => fetchAssets(), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            {total} asset{total !== 1 ? "s" : ""} in your library
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash className="mr-1.5 size-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Tabs for view mode toggle + content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
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
          <TabsList variant="line" className="h-8 shrink-0">
            <TabsTrigger value="grid" className="gap-1 px-2">
              <GridFour className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1 px-2">
              <ListDashes className="size-3.5" />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content */}
        <TabsContent value="grid" className="mt-0">
          {searchLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="p-2 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 && search && hasSearched ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
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
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <GridFour className="mb-3 size-10 text-muted-foreground" weight="thin" />
              <p className="mb-1 text-sm font-medium text-foreground">No media yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Upload images to build your media library.
              </p>
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Upload Media
              </Button>
            </div>
          ) : (
            <MediaGrid
              assets={assets}
              onSelect={viewMode === "grid" ? handleSelect : undefined}
              selectedIds={selectedIds}
              onDelete={handleDeleteAsset}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <PlatformDimensionHints connectedPlatforms={connectedPlatforms} />
        </TabsContent>
      </Tabs>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
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
