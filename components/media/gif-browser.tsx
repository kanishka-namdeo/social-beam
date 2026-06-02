"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GridFour, ListDashes, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalMediaGrid, type ExternalMediaItem } from "./external-media-grid";
import { PreviewDrawer } from "./preview-drawer";
import { toast } from "sonner";

interface GifBrowserProps {
  onImportComplete?: () => void;
}

export function GifBrowser({ onImportComplete }: GifBrowserProps) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<ExternalMediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<"compact" | "large">("compact");
  const [previewItem, setPreviewItem] = useState<ExternalMediaItem | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchResults = useCallback(async (q: string, p: number, append = false) => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("provider", "giphy");
      if (q) params.set("q", q);
      params.set("page", String(p));

      const res = await fetch(`/api/media/external/search?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Search failed" }));
        throw new Error(err.message || `API error: ${res.status}`);
      }

      const json = await res.json();
      if (!mountedRef.current) return;

      const newItems = json.data?.items ?? [];

      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setTotal(json.data?.total ?? 0);
      setHasSearched(true);
    } catch {
      if (!mountedRef.current) return;
      setError("Failed to load GIFs. Please try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch when searchTerm or page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults(searchTerm, page, page > 1);
  }, [searchTerm, page, fetchResults]);

  const handleToggleSelect = useCallback((item: ExternalMediaItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const handleImport = async () => {
    const selected = items.filter((item) => selectedIds.has(item.id));
    if (selected.length === 0) return;

    setIsImporting(true);
    try {
      const res = await fetch("/api/media/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((item) => ({
            url: item.url,
            originalName: `gif-${item.id}.gif`,
            mimeType: "image/gif",
            attribution: {
              userName: item.userName,
              provider: "giphy",
            },
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Import failed" }));
        throw new Error(err.error || "Import failed");
      }

      const data = await res.json();
      const importedCount = data.data?.imported?.length ?? 0;
      const errorCount = data.data?.errors?.length ?? 0;

      if (importedCount > 0 && errorCount === 0) {
        toast.success(`${importedCount} GIF${importedCount > 1 ? "s" : ""} added to library`);
      } else if (importedCount > 0 && errorCount > 0) {
        toast.warning(`${importedCount}/${selected.length} GIFs added`, {
          description: `${errorCount} failed to import.`,
        });
      } else {
        toast.error("Failed to import GIFs", {
          description: "All selected items failed to import.",
        });
      }

      setSelectedIds(new Set());
      onImportComplete?.();
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div className="space-y-4">
      {/* Search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search GIFs..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHasSearched(false); }}
            className="pl-9"
          />
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "compact" | "large")}>
          <TabsList variant="line" className="h-8 shrink-0">
            <TabsTrigger value="compact" className="gap-1 px-2">
              <GridFour className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="large" className="gap-1 px-2">
              <ListDashes className="size-3.5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchResults(searchTerm, page)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-12 text-center">
          <MagnifyingGlass className="mb-3 size-10 text-muted-foreground" weight="thin" />
          <p className="mb-1 text-sm font-medium text-foreground">No GIFs found</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Try a different search term.
          </p>
        </div>
      )}

      {/* Initial loading state */}
      {!loading && !error && items.length === 0 && !hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-12 text-center">
          <MagnifyingGlass className="mb-3 size-10 text-muted-foreground animate-pulse" weight="thin" />
          <p className="mb-1 text-sm font-medium text-foreground">Loading trending GIFs...</p>
        </div>
      )}

      {/* Grid with optional preview drawer */}
      <div className="relative">
        {items.length > 0 && (
          <ExternalMediaGrid
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onPreview={setPreviewItem}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            hasMore={hasMore}
            loading={loading && items.length > 0}
            viewMode={viewMode}
          />
        )}
        {previewItem && (
          <PreviewDrawer
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onAdd={() => handleToggleSelect(previewItem)}
            isSelected={selectedIds.has(previewItem.id)}
          />
        )}
      </div>

      {/* Sticky footer with selection */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between rounded-sm border border-border bg-card p-3 shadow-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : `Add ${selectedIds.size} to Library`}
          </Button>
        </div>
      )}
    </div>
  );
}
