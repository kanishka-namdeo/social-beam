"use client";

import { useState } from "react";
import {
  Archive,
  Check,
  Copy,
  DotsThreeVertical,
  DownloadSimple,
  Image,
  PencilSimple,
  Tag,
  Trash,
  Sparkle,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MediaAsset } from "@/lib/media/types";
import { PLATFORM_DIMENSIONS } from "@/lib/media/constants";

export interface MediaCardProps {
  asset: MediaAsset;
  onDelete?: (id: string) => void;
  onSelect?: (asset: MediaAsset) => void;
  selected?: boolean;
  showActions?: boolean;
  onAssetUpdate?: (asset: MediaAsset) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFilename(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name;
  const extIndex = name.lastIndexOf(".");
  if (extIndex === -1) return `${name.slice(0, maxLength)}...`;
  const ext = name.slice(extIndex);
  const namePart = name.slice(0, extIndex);
  const maxNameLength = maxLength - ext.length - 1;
  return `${namePart.slice(0, maxNameLength)}...${ext}`;
}

export function MediaCard({ asset, onDelete, onSelect, selected = false, showActions = true, onAssetUpdate }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(asset.originalName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tagEditOpen, setTagEditOpen] = useState(false);
  const [tagValue, setTagValue] = useState(asset.tags.join(", "));
  const [isSavingTags, setIsSavingTags] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.publicUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        onDelete(asset.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleToggleArchive = async () => {
    const newStatus = asset.status === "archived" ? "active" : "archived";
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const json = await res.json();
      onAssetUpdate?.(json.data as MediaAsset);
      toast.success(newStatus === "archived" ? "Asset archived" : "Asset unarchived");
    } catch {
      toast.error("Failed to update asset");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: renameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      const json = await res.json();
      onAssetUpdate?.(json.data as MediaAsset);
      setRenameOpen(false);
      toast.success("Asset renamed");
    } catch {
      toast.error("Failed to rename asset");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleSaveTags = async () => {
    const tags = tagValue.split(",").map((t) => t.trim()).filter(Boolean);
    setIsSavingTags(true);
    try {
      const res = await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error("Failed to update tags");
      const json = await res.json();
      onAssetUpdate?.(json.data as MediaAsset);
      setTagEditOpen(false);
      toast.success("Tags updated");
    } catch {
      toast.error("Failed to update tags");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleGenerateVariants = async () => {
    setGeneratingVariants(true);
    const platforms = Object.keys(PLATFORM_DIMENSIONS);
    let successCount = 0;
    for (const platform of platforms) {
      const sizeTypes = Object.keys(PLATFORM_DIMENSIONS[platform].sizes);
      if (sizeTypes.length === 0) continue;
      try {
        const res = await fetch(`/api/media/${asset.id}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, sizeType: sizeTypes[0] }),
        });
        if (res.ok) successCount++;
      } catch {
        // Continue with other platforms
      }
    }
    setGeneratingVariants(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} variant${successCount > 1 ? "s" : ""}`);
    } else {
      toast.error("Failed to generate variants");
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = asset.publicUrl;
    a.download = asset.originalName;
    a.click();
  };

  return (
    <>
    <div
      className={cn(
        "group relative overflow-hidden rounded-sm border border-border bg-card transition-all hover:shadow-md",
        selected && "ring-2 ring-brand",
        asset.status === "archived" && "opacity-60",
      )}
    >
      {/* Archive badge */}
      {asset.status === "archived" && (
        <div className="absolute left-2 top-2 z-10">
          <Badge variant="secondary" className="text-[10px] normal-case gap-1">
            <Archive className="size-3" /> Archived
          </Badge>
        </div>
      )}

      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageError ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Image className="size-8" weight="thin" />
          </div>
        ) : (
          <img
            src={asset.publicUrl}
            alt={asset.originalName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}

        {/* Selection overlay */}
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(asset)}
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={selected ? "Deselect image" : "Select image"}
          >
            <div className="absolute right-2 top-2">
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded-sm border-2",
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-overlay",
                )}
              >
                {selected && <span className="text-xs">✓</span>}
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Info area */}
      <div className="flex items-center justify-between p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground" title={asset.originalName}>
            {truncateFilename(asset.originalName)}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{asset.width}×{asset.height}</span>
            <span>·</span>
            <span>{formatFileSize(asset.fileSize)}</span>
          </div>
        </div>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <DotsThreeVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleCopyUrl}>
                {copySuccess ? (
                  <Check className="mr-2 size-3.5 text-success animate-[scale-in_150ms_ease-out]" weight="bold" />
                ) : (
                  <Copy className="mr-2 size-3.5" />
                )}
                {copySuccess ? "Copied!" : "Copy URL"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <DownloadSimple className="mr-2 size-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setRenameValue(asset.originalName); setRenameOpen(true); }}>
                <PencilSimple className="mr-2 size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTagValue(asset.tags.join(", ")); setTagEditOpen(true); }}>
                <Tag className="mr-2 size-3.5" />
                Edit Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateVariants} disabled={generatingVariants}>
                <Sparkle className="mr-2 size-3.5" />
                {generatingVariants ? "Generating..." : "Generate Variants"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleArchive} disabled={isArchiving}>
                <Archive className="mr-2 size-3.5" />
                {isArchiving ? "Updating..." : asset.status === "archived" ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive" disabled={isDeleting}>
                <Trash className="mr-2 size-3.5" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tags */}
      {asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {asset.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] normal-case">
              {tag}
            </Badge>
          ))}
          {asset.tags.length > 2 && (
            <Badge variant="secondary" className="text-[10px] normal-case">
              +{asset.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>

    {/* Rename dialog */}
    {renameOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
        <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
          <h3 className="text-sm font-semibold text-foreground">Rename Asset</h3>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenameOpen(false); }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleRename} disabled={isRenaming}>{isRenaming ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    )}

    {/* Tag edit dialog */}
    {tagEditOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
        <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
          <h3 className="text-sm font-semibold text-foreground">Edit Tags</h3>
          <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas</p>
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveTags(); if (e.key === "Escape") setTagEditOpen(false); }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTagEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveTags} disabled={isSavingTags}>{isSavingTags ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
