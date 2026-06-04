import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  InstagramLogo,
  MetaLogo,
  XLogo,
  LinkedinLogo,
  TiktokLogo,
  ChatCircleText,
  At,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

interface EngagementItemCardProps {
  item: {
    id: string;
    platform: string;
    type: string;
    authorName: string | null;
    content: string;
    parentContent: string | null;
    status: string;
    createdAt: Date | string;
    sentiment: string | null;
    aiDraft: string | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  facebook: MetaLogo,
  x: XLogo,
  linkedin: LinkedinLogo,
  tiktok: TiktokLogo,
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  COMMENT: ChatCircleText,
  MENTION: At,
  DM: PaperPlaneTilt,
};

const statusColors: Record<string, string> = {
  UNREAD: "bg-brand-soft text-brand",
  READ: "bg-muted text-muted-foreground",
  REPLIED: "bg-success/10 text-success",
  DISMISSED: "bg-muted/50 text-muted-foreground line-through",
};

export function EngagementItemCard({ item, isSelected, onClick }: EngagementItemCardProps) {
  const PlatformIcon = platformIcons[item.platform];
  const TypeIcon = typeIcons[item.type];
  const timeStr = typeof item.createdAt === "string" ? new Date(item.createdAt) : item.createdAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors focus:outline-none focus:bg-muted/50",
        isSelected && "bg-muted",
        item.status === "UNREAD" && "border-l-2 border-l-brand",
        item.status === "DISMISSED" && "opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 flex items-center gap-1">
          {PlatformIcon && <PlatformIcon className="size-4 text-muted-foreground" />}
          {TypeIcon && <TypeIcon className="size-3 text-muted-foreground" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate-2 flex-1">
              {item.authorName ?? "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 tabular-nums">
              {formatDistanceToNow(timeStr, { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-foreground truncate-2 mb-2">
            {item.content}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="rounded-sm text-xs">
              {item.platform}
            </Badge>
            <Badge
              className={cn("rounded-sm text-xs", statusColors[item.status])}
              variant={item.status === "UNREAD" ? "default" : "outline"}
            >
              {item.status.toLowerCase()}
            </Badge>
            {item.aiDraft && (
              <Badge variant="secondary" className="rounded-sm text-xs">
                AI draft ready
              </Badge>
            )}
            {item.sentiment && (
              <Badge variant="outline" className="rounded-sm text-xs">
                {item.sentiment}
              </Badge>
            )}
          </div>

          {item.parentContent && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1 border-l-2 border-border pl-2">
              {item.parentContent}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
