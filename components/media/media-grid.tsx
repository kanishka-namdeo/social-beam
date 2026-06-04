"use client";

import { MediaCard } from "./media-card";
import { STAGGER_CLASSES } from "@/components/ui/stagger-page";
import type { MediaAsset } from "@/lib/media/types";

export interface MediaGridProps {
  assets: MediaAsset[];
  onDelete?: (id: string) => void;
  onSelect?: (asset: MediaAsset) => void;
  selectedIds?: Set<string>;
  showActions?: boolean;
  onAssetUpdate?: (asset: MediaAsset) => void;
}

export function MediaGrid({ assets, onDelete, onSelect, selectedIds = new Set(), showActions = true, onAssetUpdate }: MediaGridProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="grid-auto-fill gap-4">
      {assets.map((asset, i) => (
        <div key={asset.id} className={STAGGER_CLASSES[i % STAGGER_CLASSES.length]}>
          <MediaCard
            asset={asset}
            onDelete={onDelete}
            onSelect={onSelect}
            selected={selectedIds.has(asset.id)}
            showActions={showActions}
            onAssetUpdate={onAssetUpdate}
          />
        </div>
      ))}
    </div>
  );
}
