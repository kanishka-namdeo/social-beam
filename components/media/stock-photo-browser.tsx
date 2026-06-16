"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GridFour, ListDashes, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ExternalMediaGrid, type ExternalMediaItem } from "./external-media-grid";
import { PreviewDrawer } from "./preview-drawer";
import { toast } from "sonner";

interface StockPhotoBrowserProps {
  defaultProvider?: "all" | "unsplash" | "pexels";
  hideProviderSwitcher?: boolean;
  onImportComplete?: () => void;
  initialQuery?: string;
}

export function StockPhotoBrowser({ defaultProvider = "all", hideProviderSwitcher = false, onImportComplete, initialQuery }: StockPhotoBrowserProps) {
  const [provider, setProvider] = useState<"all" | "unsplash" | "pexels">(defaultProvider);
  const [query, setQuery] = useState(initialQuery ?? "");
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchResults = useCallback(async (q: string, p: number, append = false) => {
    if (!mountedRef.current) return;

    // Cancel any in-flight fetches so stale responses can't overwrite newer state.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const providersToFetch: ("unsplash" | "pexels")[] = provider === "all"
      ? ["unsplash", "pexels"]
      : [provider as "unsplash" | "pexels"];

    try {
      const allItems: ExternalMediaItem[] = [];
      let totalResults = 0;

      const results = await Promise.allSettled(
        providersToFetch.map(async (prov) => {
          const params = new URLSearchParams();
          params.set("provider", prov);
          if (q) params.set("q", q);
          params.set("page", String(p));

          const res = await fetch(`/api/media/external/search?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: "Search failed" }));
            throw new Error(err.message || `API error: ${res.status}`);
          }
          return await res.json();
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allItems.push(...(result.value.data?.items ?? []));
          totalResults += result.value.data?.total ?? 0;
        } else {
          // Ignore aborted fetches; surface other failures.
          const reason = result.reason as { name?: string } | undefined;
          if (reason?.name !== "AbortError") {
            console.warn("Provider search failed:", result.reason);
          }
        }
      }

      if (controller.signal.aborted || !mountedRef.current) return;

      if (provider === "all") {
        for (let i = allItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }
      }

      if (append) {
        setItems((prev) => [...prev, ...allItems]);
      } else {
        setItems(allItems);
      }
      setTotal(totalResults);
      setHasSearched(true);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setError("Search failed. Please try again.");
    } finally {
      if (!controller.signal.aborted && mountedRef.current) setLoading(false);
    }
  }, [provider]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Trigger initial search when initialQuery is provided
  useEffect(() => {
    if (initialQuery && !hasSearched) {
      setSearchTerm(initialQuery);
    }
  }, [initialQuery]);

  // Fetch when searchTerm or page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResults(searchTerm, page, page > 1);
  }, [searchTerm, page, fetchResults]);

  // Reset on provider change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setItems([]);
    setSelectedIds(new Set());
  }, [provider]);

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
            originalName: `stock-${item.id}.${item.mimeType === "image/gif" ? "gif" : "jpg"}`,
            mimeType: item.mimeType,
            attribution: {
              userName: item.userName,
              userUrl: item.userUrl,
              provider: item.userUrl?.includes("unsplash") ? "unsplash" : "pexels",
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
        toast.success(`${importedCount} photo${importedCount > 1 ? "s" : ""} added to library`);
      } else if (importedCount > 0 && errorCount > 0) {
        toast.warning(`${importedCount}/${selected.length} photos added`, {
          description: `${errorCount} failed to import.`,
        });
      } else {
        toast.error("Failed to import photos", {
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
      {/* Provider switcher + search + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!hideProviderSwitcher && (
          <Tabs value={provider} onValueChange={(v) => setProvider(v as "all" | "unsplash" | "pexels")}>
            <TabsList variant="line" className="h-8 shrink-0">
              <TabsTrigger value="all" className="px-2 text-xs">All</TabsTrigger>
              <TabsTrigger value="unsplash" className="px-2 text-xs">Unsplash</TabsTrigger>
              <TabsTrigger value="pexels" className="px-2 text-xs">Pexels</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className={cn("relative", hideProviderSwitcher ? "" : "flex-1")}>
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stock photos..."
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
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-empty text-center">
          <MagnifyingGlass className="mb-3 size-10 text-muted-foreground" weight="thin" />
          <p className="mb-1 text-sm font-medium text-foreground">No results found</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Try a different search term or browse trending photos.
          </p>
        </div>
      )}

      {/* Initial empty state */}
      {!loading && !error && items.length === 0 && !hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border p-empty text-center">
          <MagnifyingGlass className="mb-3 size-10 text-muted-foreground" weight="thin" />
          <p className="mb-1 text-sm font-medium text-foreground">Search for stock photos</p>
          <p className="text-xs text-muted-foreground">
            Browse high-quality images from Unsplash and Pexels.
          </p>
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
