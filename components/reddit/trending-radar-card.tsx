"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowSquareOut, ChatText, Megaphone, Sparkle, TrendUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrendingPost {
  id: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  upvotes: number;
  commentCount: number;
  relevanceScore: number | null;
  relevanceReason: string | null;
  isActionable: boolean;
  topicTags: string[];
  suggestedAction: string | null;
}

interface TrendingRadarCardProps {
  posts: TrendingPost[];
  isLoading?: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  comment: <ChatText className="size-3.5" weight="bold" />,
  create: <Megaphone className="size-3.5" weight="bold" />,
  share: <ArrowSquareOut className="size-3.5" weight="bold" />,
};

function getActionIcon(action?: string | null): React.ReactNode {
  if (!action) return null;
  const lower = action.toLowerCase();
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (lower.includes(key)) return icon;
  }
  return <Sparkle className="size-3.5" weight="bold" />;
}

function getRelevanceBadgeClass(score: number): string {
  if (score >= 0.7) return "bg-ai-confidence-high/10 text-ai-confidence-high";
  if (score >= 0.4) return "bg-ai-confidence-medium/10 text-ai-confidence-medium";
  return "bg-ai-confidence-low/10 text-ai-confidence-low";
}

function getRelevanceLabel(score: number): string {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export function TrendingRadarCard({ posts, isLoading }: TrendingRadarCardProps) {
  const actionablePosts = posts.filter((p) => p.isActionable).slice(0, 5);

  if (isLoading) {
    return (
      <Card className="border-ai-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Reddit Trending Radar
          </CardTitle>
          <CardDescription>Loading trending posts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="border-ai-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Reddit Trending Radar
          </CardTitle>
          <CardDescription>Trending opportunities from Reddit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No trending data yet. Add subreddits to track and trigger your first scrape.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-ai-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Reddit Trending Radar
        </CardTitle>
        <CardDescription>
          {actionablePosts.length} actionable trends found in the last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionablePosts.map((post) => (
          <div key={post.id}>
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:underline truncate block"
                  >
                    {post.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">r/{post.subreddit}</span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <TrendUp className="size-3 text-success" weight="bold" />
                      {post.upvotes}
                    </span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground">{post.commentCount} comments</span>
                  </div>
                </div>
                {post.relevanceScore != null && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", getRelevanceBadgeClass(post.relevanceScore))}
                  >
                    {getRelevanceLabel(post.relevanceScore)}
                  </Badge>
                )}
              </div>
              {post.relevanceReason && (
                <p className="text-xs text-muted-foreground line-clamp-2">{post.relevanceReason}</p>
              )}
              {post.suggestedAction && (
                <div className="flex items-center gap-1.5 mt-1">
                  {getActionIcon(post.suggestedAction)}
                  <span className="text-xs text-foreground font-medium">{post.suggestedAction}</span>
                </div>
              )}
              {post.topicTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {post.topicTags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Separator className="mt-3" />
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <Button variant="default" size="sm" asChild>
            <a href="/dashboard/reddit/trending">
              View All Trends
              <ArrowSquareOut className="ml-1 size-4" weight="bold" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await fetch("/api/reddit/trending/trigger", { method: "POST" });
                const json = await res.json();
                if (res.ok) {
                  toast.success(json.data.message);
                } else {
                  toast.error(json.error ?? "Failed to trigger scrape");
                }
              } catch {
                toast.error("Failed to trigger scrape");
              }
            }}
          >
            Refresh Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
