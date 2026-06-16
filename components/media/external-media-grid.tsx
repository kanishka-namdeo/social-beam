"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Camera, Check, Plus } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import type { ExternalMediaItem } from "@/lib/media/types";

export type { ExternalMediaItem } from "@/lib/media/types";

interface ExternalMediaGridProps {
  items: ExternalMediaItem[];
  selectedIds: Set<string>;
  onToggleSelect: (item: ExternalMediaItem) => void;
  onPreview?: (item: ExternalMediaItem) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  showAttribution?: boolean;
  viewMode?: "compact" | "large";
}

export function ExternalMediaGrid({
  items,
  selectedIds,
  onToggleSelect,
  onPreview,
  onLoadMore,
  hasMore,
  loading,
  showAttribution = true,
  viewMode = "compact",
}: ExternalMediaGridProps) {
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  if (items.length === 0 && !loading) {
    return null;
  }

  const gridClasses = viewMode === "large"
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  const cardAspectClass = viewMode === "large"
    ? "aspect-[4/3]"
    : "aspect-square";

  const textClass = viewMode === "large"
    ? "text-xs"
    : "text-micro";

  return (
    <div className="space-y-4">
      <div className={gridClasses}>
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group relative overflow-hidden rounded-sm border border-border bg-card transition-all hover:shadow-md",
              selectedIds.has(item.id) && "ring-2 ring-brand",
            )}
          >
            {/* Image area */}
            <div className={cn("relative overflow-hidden bg-muted", cardAspectClass)}>
              {errorIds.has(item.id) ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Camera className="size-8" weight="thin" />
                </div>
              ) : (
                <NextImage
                  src={item.thumbUrl}
                  alt={`Photo by ${item.userName}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                  onError={() => setErrorIds((prev) => new Set(prev).add(item.id))}
                />
              )}

              {/* Preview button overlay */}
              {onPreview && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onPreview(item); }}
                  className="absolute left-2 top-2 rounded-sm bg-overlay p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Preview image"
                >
                  <Camera className="size-3.5" />
                </button>
              )}

              {/* Selection overlay */}
              <button
                type="button"
                onClick={() => onToggleSelect(item)}
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={selectedIds.has(item.id) ? "Deselect" : "Select"}
              >
                <div className="absolute right-2 top-2">
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-sm border-2",
                      selectedIds.has(item.id)
                        ? "border-brand bg-brand text-white"
                        : "border-white/80 bg-overlay",
                    )}
                  >
                    {selectedIds.has(item.id) ? (
                      <Check className="size-3" weight="bold" />
                    ) : (
                      <Plus className="size-3" weight="bold" />
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Info area */}
            <div className="p-2">
              <div className={cn("flex items-center gap-1.5 text-muted-foreground", textClass)}>
                <span>{item.width}x{item.height}</span>
              </div>
              {showAttribution && (
                <p className={cn("mt-0.5 text-muted-foreground", textClass, viewMode === "compact" ? "truncate" : "")}>
                  {item.userUrl ? (
                    <a
                      href={item.userUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.userName}
                    </a>
                  ) : (
                    item.userName
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-sm border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="flex justify-center text-xs text-muted-foreground">Loading...</div>
      )}
    </div>
  );
}
