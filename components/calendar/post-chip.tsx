"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVertical, CalendarDots, CheckCircle, WarningCircle, Spinner, Image, DotsThreeVertical, Check } from "@phosphor-icons/react/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MediaItem } from "./types";
import { getPerformanceColor, PerformanceTooltip } from "./analytics-overlay";

interface PostPlatform {
  platform: string;
  status: string;
}

interface CampaignInfo {
  id: string;
  name: string;
  status: string;
}

interface PostAnalyticsData {
  impressions: number;
  engagementRate: number;
  likes: number;
  comments: number;
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
  media?: MediaItem[];
  campaign?: CampaignInfo | null;
  category?: string | null;
  analytics?: PostAnalyticsData | null;
  isSelected?: boolean;
  onSelect?: (id: string, e: React.MouseEvent) => void;
  showAnalyticsOverlay?: boolean;
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

function MediaThumbnail({ media, compact }: { media: MediaItem[]; compact?: boolean }) {
  const firstImage = media.find((m) => m.type === "image");
  if (!firstImage) return null;

  const size = compact ? "size-4" : "size-8";

  return (
    <div className={cn("relative shrink-0 rounded-sm overflow-hidden", size)}>
      <NextImage
        src={firstImage.url}
        alt=""
        fill
        className="object-cover"
        unoptimized
      />
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
  media,
  campaign,
  category,
  analytics,
  isSelected = false,
  onSelect,
  showAnalyticsOverlay = false,
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

  const hasMediaItems = media && media.length > 0;

  // Determine performance border color when analytics overlay is active
  const performanceBorder = showAnalyticsOverlay && analytics && status === "PUBLISHED"
    ? getPerformanceColor(analytics.engagementRate)
    : null;

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(id, e);
      return;
    }
    handlePointerUp();
  };

  const chipContent = (
    <div
      ref={(node) => {
        dragRef.current = node;
        setNodeRef(node);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      style={style}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-sm border border-border/30 border-l-[3px] bg-card px-2.5 py-1.5 text-xs transition-all hover-lift hover:bg-muted/50 cursor-pointer",
        performanceBorder ?? cfg.borderColor,
        isSelected && "ring-2 ring-brand bg-brand/5",
        isDragging && "opacity-50 scale-95",
      )}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand/10 rounded-sm pointer-events-none">
          <div className="size-4 rounded-full bg-brand flex items-center justify-center">
            <Check className="size-3 text-primary-foreground" weight="bold" />
          </div>
        </div>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                {...attributes}
                {...listeners}
                className="cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label="Drag to reschedule"
              >
                <DotsSixVertical className="size-3 text-muted-foreground" />
              </span>
              {hasMediaItems && <MediaThumbnail media={media} compact />}
              <span className="truncate-2 font-medium text-foreground flex-1">
                {title ?? "Untitled"}
              </span>
              {!hasMediaItems && hasMedia && (
                <span className="text-muted-foreground/70" title="Has media">
                  <Image className="size-3" weight="fill" alt="" />
                </span>
              )}
              {timeStr && (
                <span className="text-micro text-muted-foreground tabular-nums shrink-0">
                  {timeStr}
                </span>
              )}
              {category && (
                <span className="text-micro px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[60px]">
                  {category}
                </span>
              )}
              <PlatformDots platforms={platforms} />
              {campaign && (
                <span
                  className="group/campaign relative flex items-center"
                  title={campaign.name}
                >
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/campaign:block whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-micro text-background shadow-lg">
                    {campaign.name}
                  </span>
                </span>
              )}
            </div>
          </TooltipTrigger>
          {showAnalyticsOverlay && analytics && status === "PUBLISHED" && (
            <TooltipContent side="top" className="max-w-xs">
              <PerformanceTooltip analytics={analytics} />
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
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
      onClick={handleClick}
      style={style}
      className={cn(
        "group relative flex flex-col gap-1 rounded-sm border border-border/30 border-l-[3px] bg-card p-2 transition-all hover-lift hover:bg-muted/50 cursor-pointer",
        performanceBorder ?? cfg.borderColor,
        isSelected && "ring-2 ring-brand bg-brand/5",
        isDragging && "opacity-50 scale-95",
      )}
    >
      {isSelected && (
        <div className="absolute top-1 right-1 pointer-events-none">
          <div className="size-4 rounded-full bg-brand flex items-center justify-center">
            <Check className="size-3 text-primary-foreground" weight="bold" />
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label="Drag to reschedule"
        >
          <DotsSixVertical className="size-3.5 text-muted-foreground" />
        </span>
        {hasMediaItems && <MediaThumbnail media={media} />}
        <span className="truncate text-sm font-medium text-foreground flex-1">
          {title ?? "Untitled"}
        </span>
        {!hasMediaItems && hasMedia && (
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
          <span className="text-micro text-muted-foreground tabular-nums">
            {timeStr}
          </span>
        )}
        <Badge
          variant="outline"
          className={cn("text-micro gap-0.5 normal-case rounded-sm px-1.5 py-0", cfg.className)}
        >
          {cfg.icon}
          {cfg.label}
        </Badge>
        {category && (
          <span className="text-micro px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[80px]">
            {category}
          </span>
        )}
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
        {campaign && (
          <span
            className="group/campaign relative flex items-center"
            title={campaign.name}
          >
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/campaign:block whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-micro text-background shadow-lg">
              {campaign.name}
            </span>
          </span>
        )}
      </div>
      {confidence && (
        <div className={cn(
          "pl-4 text-micro",
          confidence === "HIGH" && "text-ai-confidence-high",
          confidence === "MEDIUM" && "text-ai-confidence-medium",
          confidence === "LOW" && "text-ai-confidence-low",
        )}>
          {confidence.toLowerCase()} confidence
        </div>
      )}
      {showAnalyticsOverlay && analytics && status === "PUBLISHED" && (
        <div className="pl-4 text-micro text-muted-foreground flex items-center gap-2">
          <span>{analytics.impressions.toLocaleString()} views</span>
          <span>{analytics.engagementRate.toFixed(1)}% eng.</span>
        </div>
      )}
    </div>
  );
}
