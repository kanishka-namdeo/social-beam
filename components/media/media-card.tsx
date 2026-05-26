"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  DotsThreeVertical,
  Image,
  Trash,
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

interface MediaCardProps {
  asset: MediaAsset;
  onDelete?: (id: string) => void;
  onSelect?: (asset: MediaAsset) => void;
  selected?: boolean;
  showActions?: boolean;
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

export function MediaCard({ asset, onDelete, onSelect, selected = false, showActions = true }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md",
        selected && "ring-2 ring-brand",
      )}
    >
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
                    : "border-white/80 bg-black/20",
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
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={handleCopyUrl}>
                {copySuccess ? (
                  <Check className="mr-2 size-3.5 text-success animate-[scale-in_150ms_ease-out]" weight="bold" />
                ) : (
                  <Copy className="mr-2 size-3.5" />
                )}
                {copySuccess ? "Copied!" : "Copy URL"}
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
  );
}
