"use client";

import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVertical, CalendarDots, CheckCircle, WarningCircle, Spinner, Image, DotsThreeVertical } from "@phosphor-icons/react/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PostPlatform {
  platform: string;
  status: string;
}

interface PostChipProps {
  id: string;
  title: string | null;
  status: string;
  confidence: string | null;
  scheduledAt: string | null;
  platforms: PostPlatform[];
  compact?: boolean;
  hasMedia?: boolean;
  onPreview?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (postId: string) => Promise<void>;
  showActions?: boolean;
}

const statusConfig: Record<string, {
  label: string;
  className: string;
  borderColor: string;
  icon?: React.ReactNode;
}> = {
  DRAFT: {
    label: "Draft",
    className: "bg-post-draft/10 text-post-draft",
    borderColor: "border-l-post-draft/20",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-post-queued/10 text-post-queued",
    borderColor: "border-l-post-queued/20",
    icon: <CalendarDots weight="bold" className="size-3" />,
  },
  PUBLISHING: {
    label: "Publishing",
    className: "bg-post-publishing/10 text-post-publishing",
    borderColor: "border-l-post-publishing/20",
    icon: <Spinner weight="bold" className="size-3 animate-spin" />,
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-post-published/10 text-post-published",
    borderColor: "border-l-post-published/20",
    icon: <CheckCircle weight="bold" className="size-3" />,
  },
  FAILED: {
    label: "Failed",
    className: "bg-post-failed/10 text-post-failed",
    borderColor: "border-l-post-failed/20",
    icon: <WarningCircle weight="bold" className="size-3" />,
  },
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

function PlatformDots({ platforms }: { platforms: PostPlatform[] }) {
  return (
    <div className="flex gap-0.5 shrink-0">
      {platforms.map((p) => (
        <span
          key={p.platform}
          className={cn(
            "size-2 rounded-sm",
            platformColors[p.platform] ?? "bg-muted",
          )}
          title={p.platform}
        />
      ))}
    </div>
  );
}

export function PostChip({
  id,
  title,
  status,
  confidence,
  scheduledAt,
  platforms,
  compact = false,
  hasMedia = false,
  onPreview,
  onDelete,
  onDuplicate,
  showActions = false,
}: PostChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post-${id}`,
    data: {
      postId: id,
      type: "post",
      scheduledAt,
    },
  });

  const dragRef = useRef<HTMLDivElement>(null);
  const [dragMoved, setDragMoved] = useState(false);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const cfg = statusConfig[status] ?? statusConfig.DRAFT;

  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const handlePointerDown = () => setDragMoved(false);
  const handlePointerMove = () => setDragMoved(true);
  const handlePointerUp = () => {
    if (!dragMoved && onPreview) {
      onPreview(id);
    }
    setDragMoved(false);
  };

  const chipContent = (
    <div
      ref={(node) => {
        dragRef.current = node;
        setNodeRef(node);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-sm border border-border/30 border-l-[3px] bg-card px-2.5 py-1.5 text-xs transition-all hover-lift hover:bg-muted/50 cursor-pointer",
        cfg.borderColor,
        isDragging && "opacity-50 shadow-md",
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
        aria-label="Drag to reschedule"
      >
        <DotsSixVertical className="size-3 text-muted-foreground" />
      </span>
      <span className="truncate font-medium text-foreground flex-1">
        {title ?? "Untitled"}
      </span>
      {hasMedia && (
        <span className="text-muted-foreground/70" title="Has media">
          <Image className="size-3" weight="fill" alt="" />
        </span>
      )}
      {timeStr && (
        <span className="text-[0.625rem] text-muted-foreground tabular-nums shrink-0">
          {timeStr}
        </span>
      )}
      <PlatformDots platforms={platforms} />
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
              aria-label="Post actions"
              onClick={(e) => e.stopPropagation()}
            >
              <DotsThreeVertical className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onPreview?.(id)}>
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(id)}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  if (compact) {
    return chipContent;
  }

  return (
    <div
      ref={(node) => {
        dragRef.current = node;
        setNodeRef(node);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      className={cn(
        "group relative flex flex-col gap-1 rounded-sm border border-border/30 border-l-[3px] bg-card p-2 transition-all hover-lift hover:bg-muted/50 cursor-pointer",
        cfg.borderColor,
        isDragging && "opacity-50 shadow-md",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
          aria-label="Drag to reschedule"
        >
          <DotsSixVertical className="size-3.5 text-muted-foreground" />
        </span>
        <span className="truncate text-sm font-medium text-foreground flex-1">
          {title ?? "Untitled"}
        </span>
        {hasMedia && (
          <span className="text-muted-foreground/70" title="Has media">
            <Image className="size-4" weight="fill" alt="" />
          </span>
        )}
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                aria-label="Post actions"
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThreeVertical className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onPreview?.(id)}>
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex items-center gap-1.5 pl-4">
        {timeStr && (
          <span className="text-[0.625rem] text-muted-foreground tabular-nums">
            {timeStr}
          </span>
        )}
        <Badge
          variant="outline"
          className={cn("text-[0.625rem] gap-0.5 normal-case rounded-sm px-1.5 py-0", cfg.className)}
        >
          {cfg.icon}
          {cfg.label}
        </Badge>
        <div className="flex gap-0.5 ml-auto">
          {platforms.map((p) => (
            <span
              key={p.platform}
              className={cn(
                "size-2 rounded-sm",
                platformColors[p.platform] ?? "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
      {confidence && (
        <div className={cn(
          "pl-4 text-[0.625rem]",
          confidence === "HIGH" && "text-ai-confidence-high",
          confidence === "MEDIUM" && "text-ai-confidence-medium",
          confidence === "LOW" && "text-ai-confidence-low",
        )}>
          {confidence.toLowerCase()} confidence
        </div>
      )}
    </div>
  );
}
