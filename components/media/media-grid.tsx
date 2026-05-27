"use client";

import { MediaCard } from "./media-card";

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

interface MediaGridProps {
  assets: MediaAsset[];
  onDelete?: (id: string) => void;
  onSelect?: (asset: MediaAsset) => void;
  selectedIds?: Set<string>;
  showActions?: boolean;
}

export function MediaGrid({ assets, onDelete, onSelect, selectedIds = new Set(), showActions = true }: MediaGridProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <MediaCard
          key={asset.id}
          asset={asset}
          onDelete={onDelete}
          onSelect={onSelect}
          selected={selectedIds.has(asset.id)}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
