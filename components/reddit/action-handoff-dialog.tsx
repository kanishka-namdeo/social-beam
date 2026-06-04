"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendUp,
  ChatText,
  ArrowSquareOut,
  Sparkle,
  ShieldWarning,
  Smiley,
  SmileyXEyes,
  Warning,
  ArrowClockwise,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePremium } from "@/hooks/use-premium";
import type { TrendingPost } from "@/lib/reddit/types";
import { getRelevanceBadgeClass, isAiAnalysisFailed } from "@/lib/reddit/types";

interface ActionHandoffDialogProps {
  post: TrendingPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  onMarkActed?: () => void;
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

function getSentimentIcon(sentiment: string | null | undefined, className: string) {
  switch (sentiment) {
    case "positive":
      return <Smiley className={className} weight="fill" />;
    case "controversial":
      return <SmileyXEyes className={className} weight="fill" />;
    default:
      return <Smiley className={className} weight="regular" />;
  }
}

function getRiskIcon(risk: string | null | undefined, className: string) {
  switch (risk) {
    case "high":
      return <Warning className={className} weight="fill" />;
    case "medium":
      return <ShieldWarning className={className} weight="fill" />;
    default:
      return <ShieldWarning className={className} weight="regular" />;
  }
}

export function ActionHandoffDialog({ post, open, onOpenChange, onDismiss, onMarkActed }: ActionHandoffDialogProps) {
  const { isPremium } = usePremium();
  const [analyzing, setAnalyzing] = useState(false);

  if (!post) return null;

  const handleCompose = () => {
    const params = new URLSearchParams({ trendId: post.id });
    window.location.href = `/compose?${params.toString()}`;
  };

  const handleReAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/reddit/trending/analyze/${post.id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Post re-analyzed successfully");
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(json.error ?? "Re-analysis failed");
      }
    } catch {
      toast.error("Re-analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
    onOpenChange(false);
  };

  const handleMarkActed = () => {
    onMarkActed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Create a post from this trend
          </DialogTitle>
          <DialogDescription>
            Use this trending discussion as inspiration for your next post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trend summary */}
          <div className="rounded-sm border border-border bg-muted/20 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{post.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>r/{post.subreddit}</span>
              <span className="flex items-center gap-0.5">
                <TrendUp className="size-3 text-success" weight="bold" />
                {post.upvotes.toLocaleString()}
              </span>
              <span className="flex items-center gap-0.5">
                <ChatText className="size-3" weight="bold" />
                {post.commentCount.toLocaleString()}
              </span>
            </div>

            {/* Sentiment and Risk badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn("text-xs flex items-center gap-1", getSentimentBadgeClass(post.sentiment))}
              >
                {getSentimentIcon(post.sentiment, "size-3")}
                Sentiment: {post.sentiment ?? "neutral"}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs flex items-center gap-1", getRiskBadgeClass(post.riskLevel))}
              >
                {getRiskIcon(post.riskLevel, "size-3")}
                Risk: {post.riskLevel ?? "low"}
              </Badge>
              {post.relevanceScore != null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getRelevanceBadgeClass(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason)),
                  )}
                >
                  {isAiAnalysisFailed(post.relevanceReason)
                    ? "Needs review"
                    : `${(post.relevanceScore * 100).toFixed(0)}% relevance`}
                </Badge>
              )}
            </div>

            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              View on Reddit
              <ArrowSquareOut className="size-3" weight="bold" />
            </a>
          </div>

          {/* Risk warning */}
          {post.riskLevel === "high" && post.riskReason && (
            <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <Warning className="size-3.5" weight="fill" />
                High Risk Trend
              </div>
              <p className="text-xs text-muted-foreground">{post.riskReason}</p>
            </div>
          )}

          {/* AI suggestion */}
          {post.relevanceReason && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">AI Suggestion</p>
              <p className="text-sm text-foreground">{post.relevanceReason}</p>
            </div>
          )}

          {/* Risk reason */}
          {post.riskReason && post.riskLevel !== "low" && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Risk Assessment</p>
              <p className="text-sm text-foreground">{post.riskReason}</p>
            </div>
          )}

          {/* Topic tags */}
          {post.topicTags && post.topicTags.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Suggested Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {post.topicTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag.replace(/\s+/g, "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggested action */}
          {post.suggestedAction && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Suggested Action</p>
              <p className="text-sm text-foreground">{post.suggestedAction}</p>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReAnalyze}
              disabled={analyzing}
              className="gap-1.5"
            >
              <ArrowClockwise className={cn("size-3.5", analyzing && "animate-spin")} weight="bold" />
              {analyzing ? "Re-analyzing..." : "Re-analyze"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="gap-1.5 text-muted-foreground"
            >
              <XCircle className="size-3.5" />
              Dismiss
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkActed} className="gap-1.5">
              <CheckCircle className="size-3.5" />
              Mark Acted
            </Button>
            {isPremium ? (
              <Button onClick={handleCompose}>
                Compose with this trend
                <ArrowSquareOut className="ml-1.5 size-4" weight="bold" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/billing">
                  <Sparkle className="size-3.5" weight="fill" />
                  Premium
                </Link>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
