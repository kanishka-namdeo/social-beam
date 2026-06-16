"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import {
  ArrowsClockwise,
  ArrowSquareOut,
  Check,
  X,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ExternalMediaItem } from "@/lib/media/types";

interface PreviewDrawerProps {
  item: ExternalMediaItem;
  onClose: () => void;
  onAdd: () => void;
  isSelected?: boolean;
  className?: string;
}

export function PreviewDrawer({ item, onClose, onAdd, isSelected = false, className }: PreviewDrawerProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoading(true);
  }, [item.id]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute right-0 top-0 z-overlay flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl sm:w-96",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold text-foreground">Preview</h3>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close preview">
          <X className="size-4" />
        </Button>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative mb-3 overflow-hidden rounded-sm border border-border bg-muted">
          {imageLoading && (
            <Skeleton className="aspect-video w-full rounded-none" />
          )}
          <div className={cn("relative aspect-video w-full", imageLoading ? "hidden" : "block")}>
            <NextImage
              src={item.url}
              alt={`Photo by ${item.userName}`}
              fill
              className="object-contain"
              unoptimized
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Dimensions</span>
            <span>{item.width} × {item.height}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Source</span>
            <span className="capitalize">{item.url.includes("unsplash") ? "Unsplash" : item.url.includes("pexels") ? "Pexels" : item.mimeType === "image/gif" ? "GIPHY" : "Stock"}</span>
          </div>
          {item.userName && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Author</span>
              {item.userUrl ? (
                <a
                  href={item.userUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand hover:underline"
                >
                  {item.userName}
                  <ArrowSquareOut className="size-3" />
                </a>
              ) : (
                <span>{item.userName}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border p-3">
        <Button
          className="w-full gap-2"
          onClick={() => { onAdd(); onClose(); }}
          disabled={isSelected}
        >
          {isSelected ? (
            <>
              <Check className="size-4" weight="bold" />
              Added to Library
            </>
          ) : (
            <>
              <ArrowsClockwise className="size-4" />
              Add to Library
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
