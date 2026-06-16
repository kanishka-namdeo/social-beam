"use client";

import NextImage from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Image, Play, CalendarDots, Copy, Trash } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import type { PostItem, MediaItem } from "./types";

interface PostPreviewDialogProps {
  open: boolean;
  post: PostItem | null;
  onClose: () => void;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onDuplicate: (postId: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-post-draft/10 text-post-draft border-post-draft/20" },
  SCHEDULED: { label: "Scheduled", className: "bg-post-queued/10 text-post-queued border-post-queued/20" },
  PUBLISHING: { label: "Publishing", className: "bg-post-publishing/10 text-post-publishing border-post-publishing/20" },
  PUBLISHED: { label: "Published", className: "bg-post-published/10 text-post-published border-post-published/20" },
  FAILED: { label: "Failed", className: "bg-post-failed/10 text-post-failed border-post-failed/20" },
};

const platformColors: Record<string, string> = {
  instagram: "bg-preview-instagram",
  facebook: "bg-preview-facebook",
  x: "bg-preview-x",
  linkedin: "bg-preview-linkedin",
  tiktok: "bg-preview-tiktok",
  pinterest: "bg-preview-pinterest",
  threads: "bg-preview-threads",
  googleBusiness: "bg-preview-googleBusiness",
  youtube: "bg-preview-youtube",
  bluesky: "bg-preview-bluesky",
};

export function PostPreviewDialog({
  open,
  post,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: PostPreviewDialogProps) {
  if (!post) return null;

  const cfg = statusConfig[post.status] ?? statusConfig.DRAFT;
  const mediaItems: MediaItem[] = post.media ?? [];

  const handleDelete = () => {
    onDelete(post.id);
    onClose();
  };

  const handleDuplicate = async () => {
    await onDuplicate(post.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-lg">{post.title ?? "Untitled Post"}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("normal-case gap-1", cfg.className)}
                >
                  <CalendarDots weight="bold" className="size-3" />
                  {cfg.label}
                </Badge>
                {post.scheduledAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.scheduledAt).toLocaleString()}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Target platforms */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Target Platforms
        </span>
        <div className="flex flex-wrap gap-2">
          {post.platforms.map((p) => (
            <span
              key={p.platform}
              className={cn(
                "flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-sm",
                  platformColors[p.platform] ?? "bg-muted",
                )}
              />
              {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                <Badge
                  variant="outline"
                  className="text-micro normal-case px-1 py-0"
                >
                  {p.status.toLowerCase()}
                </Badge>
              </span>
            ))}
          </div>
        </div>

        {/* Content preview */}
        {post.content && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Content
            </span>
            <div className="rounded-sm border border-border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
              {post.content}
            </div>
          </div>
        )}

        {/* Media */}
        {mediaItems.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Media ({mediaItems.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {mediaItems.map((media, i) => (
                <div
                  key={i}
                  className="relative group aspect-video rounded-sm border border-border bg-card overflow-hidden"
                >
                  {media.type === "image" ? (
                    <NextImage
                      src={media.url}
                      alt={`Media ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-card">
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Play weight="fill" className="size-8" />
                        <span className="text-xs">Video</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    <Badge
                      variant="secondary"
                      className="text-micro normal-case px-1 py-0 gap-1"
                    >
                      {media.type === "image" ? (
                        <Image className="size-3" alt="" />
                      ) : (
                        <Play className="size-3" />
                      )}
                      {media.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence */}
        {post.confidence && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI Confidence
            </span>
            <div>
              <Badge
                variant="outline"
                className={cn(
                  "normal-case",
                  post.confidence === "HIGH" && "text-ai-confidence-high border-ai-confidence-high",
                  post.confidence === "MEDIUM" && "text-ai-confidence-medium border-ai-confidence-medium",
                  post.confidence === "LOW" && "text-ai-confidence-low border-ai-confidence-low",
                )}
              >
                {post.confidence.toLowerCase()}
              </Badge>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash weight="bold" className="size-3.5" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleDuplicate}
          >
            <Copy weight="bold" className="size-3.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            onClick={() => onEdit(post.id)}
          >
            Edit Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
