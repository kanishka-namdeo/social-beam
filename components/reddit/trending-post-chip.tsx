"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowSquareOut, ChatText, TrendUp } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

interface TrendingPostChipProps {
  title: string;
  url: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  relevanceScore: number | null;
  isActionable: boolean;
  className?: string;
}

function getRelevanceStyle(score: number): string {
  if (score >= 0.7) return "bg-ai-confidence-high/10 text-ai-confidence-high border-ai-confidence-high/20";
  if (score >= 0.4) return "bg-ai-confidence-medium/10 text-ai-confidence-medium border-ai-confidence-medium/20";
  return "bg-ai-confidence-low/10 text-ai-confidence-low border-ai-confidence-low/20";
}

export function TrendingPostChip({
  title,
  url,
  subreddit,
  upvotes,
  commentCount,
  relevanceScore,
  isActionable,
  className,
}: TrendingPostChipProps) {
  return (
    <div
      className={cn(
        "flex-center gap-3 rounded-sm border border-border bg-card p-3 hover:bg-muted/50 transition-colors",
        isActionable && "border-ai-surface bg-ai-surface/30",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:underline truncate block"
        >
          {title}
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">r/{subreddit}</span>
          <span className="text-xs text-muted-foreground flex-center gap-0.5 tabular-nums">
            <TrendUp className="size-3 text-success" weight="bold" />
            <span className="tabular-nums">{upvotes.toLocaleString()}</span>
          </span>
          <span className="text-xs text-muted-foreground flex-center gap-0.5 tabular-nums">
            <ChatText className="size-3" weight="bold" />
            <span className="tabular-nums">{commentCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
      {relevanceScore != null && (
        <Badge
          variant="outline"
          className={cn("text-xs shrink-0", getRelevanceStyle(relevanceScore))}
        >
          {(relevanceScore * 100).toFixed(0)}%
        </Badge>
      )}
      <ArrowSquareOut className="size-4 text-muted-foreground shrink-0" weight="bold" />
    </div>
  );
}
