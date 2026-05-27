"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkle, ArrowSquareOut, X, Smiley, SmileyXEyes, Warning, ShieldWarning } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

interface TrendContext {
  id: string;
  title: string;
  subreddit: string;
  upvotes: number;
  commentCount: number;
  relevanceScore: number | null;
  relevanceReason: string | null;
  topicTags: string[];
  suggestedAction: string | null;
  url: string;
  sentiment?: string | null;
  riskLevel?: string | null;
  riskReason?: string | null;
}

function getSentimentBadgeClass(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "positive":
      return "bg-success/10 text-success border-success/20";
    case "controversial":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}

function getRiskBadgeClass(risk: string | null | undefined): string {
  switch (risk) {
    case "high":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-success/10 text-success border-success/20";
  }
}

interface TrendContextBannerProps {
  trend: TrendContext;
}

export function TrendContextBanner({ trend }: TrendContextBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkle className="size-5 text-brand mt-0.5 shrink-0" weight="fill" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Inspired by trending discussion
            </p>
            <p className="text-sm text-foreground line-clamp-1">{trend.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>r/{trend.subreddit}</span>
              <span>{trend.upvotes.toLocaleString()} upvotes</span>
              <span>{trend.commentCount.toLocaleString()} comments</span>
              {trend.relevanceScore != null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    trend.relevanceScore >= 0.7
                      ? "bg-ai-confidence-high/10 text-ai-confidence-high"
                      : trend.relevanceScore >= 0.4
                        ? "bg-ai-confidence-medium/10 text-ai-confidence-medium"
                        : "bg-ai-confidence-low/10 text-ai-confidence-low",
                  )}
                >
                  {(trend.relevanceScore * 100).toFixed(0)}% relevance
                </Badge>
              )}
              {trend.sentiment && (
                <Badge
                  variant="outline"
                  className={cn("text-xs flex items-center gap-1", getSentimentBadgeClass(trend.sentiment))}
                >
                  {trend.sentiment === "positive" ? (
                    <Smiley className="size-3" weight="bold" />
                  ) : trend.sentiment === "controversial" ? (
                    <SmileyXEyes className="size-3" weight="bold" />
                  ) : null}
                  {trend.sentiment.charAt(0).toUpperCase() + trend.sentiment.slice(1)}
                </Badge>
              )}
              {trend.riskLevel && (
                <Badge
                  variant="outline"
                  className={cn("text-xs flex items-center gap-1", getRiskBadgeClass(trend.riskLevel))}
                >
                  {trend.riskLevel === "high" ? (
                    <Warning className="size-3" weight="bold" />
                  ) : trend.riskLevel === "medium" ? (
                    <ShieldWarning className="size-3" weight="bold" />
                  ) : (
                    <ShieldWarning className="size-3" weight="bold" />
                  )}
                  {trend.riskLevel.charAt(0).toUpperCase() + trend.riskLevel.slice(1)} risk
                </Badge>
              )}
              <a
                href={trend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline inline-flex items-center gap-0.5"
              >
                View on Reddit
                <ArrowSquareOut className="size-3" weight="bold" />
              </a>
            </div>
            {trend.topicTags && trend.topicTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {trend.topicTags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag.replace(/\s+/g, "")}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss trend context"
        >
          <X className="size-4" weight="bold" />
        </Button>
      </div>
    </div>
  );
}
