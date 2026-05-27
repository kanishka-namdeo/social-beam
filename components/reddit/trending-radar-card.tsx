"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowSquareOut, Sparkle, TrendUp } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ActionHandoffDialog } from "./action-handoff-dialog";
import type { TrendingPost } from "@/lib/reddit/types";
import { getRelevanceBadgeClass, getRelevanceLabel, isAiAnalysisFailed } from "@/lib/reddit/types";
import { getActionIcon } from "@/lib/reddit/ui-helpers";

interface JobStatus {
  phase: "scraping" | "analyzing" | "done" | "error";
  progress: number;
  postsFound: number;
  analyzed: number;
  skipped: number;
  totalSubreddits: number;
  completedSubreddits: number;
  message?: string;
}

interface TrendingRadarCardProps {
  posts: TrendingPost[];
  isLoading?: boolean;
}

export function TrendingRadarCard({ posts, isLoading }: TrendingRadarCardProps) {
  const router = useRouter();
  const actionablePosts = posts.filter((p) => p.isActionable).slice(0, 5);
  const topTrend = actionablePosts.length > 0 ? actionablePosts[0] : null;
  const [triggering, setTriggering] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [selectedPost, setSelectedPost] = useState<TrendingPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollForJobStatus = useCallback(async (jobId: string, maxPolls = 40) => {
    let polls = 0;
    const poll = async () => {
      polls++;
      if (polls > maxPolls) {
        if (pollRef.current) clearTimeout(pollRef.current);
        router.refresh();
        return;
      }

      try {
        const res = await fetch(`/api/reddit/trending/status?jobId=${jobId}`);
        if (res.ok) {
          const json = await res.json();
          const status: JobStatus = json.data;
          setJobStatus(status);

          if (status.phase === "done" || status.phase === "error") {
            if (pollRef.current) clearTimeout(pollRef.current);
            setTriggering(false);
            setJobStatus(null);
            router.refresh();
            if (status.phase === "done") {
              toast.success(status.message ?? "Scrape complete");
            }
            return;
          }
        }
      } catch {
        // Silently continue polling
      }

      pollRef.current = setTimeout(poll, 3000);
    };

    pollRef.current = setTimeout(poll, 2000);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setTriggering(true);
    setJobStatus(null);
    try {
      const res = await fetch("/api/reddit/trending/trigger", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.jobId) {
        toast.success(json.data.message);
        void pollForJobStatus(json.data.jobId);
      } else {
        toast.error(json.error ?? "Failed to trigger scrape");
        setTriggering(false);
      }
    } catch {
      toast.error("Failed to trigger scrape");
      setTriggering(false);
    }
  }, [pollForJobStatus]);

  const handlePostAction = (post: TrendingPost) => {
    setSelectedPost(post);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-ai-surface/50 border-ai-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Research & Ideation
          </CardTitle>
          <CardDescription>Trending opportunities from Reddit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="bg-ai-surface/50 border-ai-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Research & Ideation
          </CardTitle>
          <CardDescription>Discover trending topics to inspire your next post</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No trending data yet. Add subreddits to track and trigger your first scrape.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/reddit/trending">
                  Set up Radar
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProgressing = triggering && jobStatus != null;

  return (
    <Card className="bg-ai-surface/50 border-ai-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Research & Ideation
        </CardTitle>
        <CardDescription>
          {actionablePosts.length} actionable trends found in the last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress indicator */}
        {isProgressing && (
          <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {jobStatus.phase === "scraping" ? "Scraping Reddit..." : "Analyzing with AI..."}
              </span>
              <span className="text-muted-foreground">{jobStatus.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-brand/10 rounded-sm overflow-hidden">
              <Progress value={jobStatus.progress} className="h-1.5 bg-brand/10" />
            </div>
            <p className="text-xs text-muted-foreground">
              {jobStatus.message ?? "Processing..."}
            </p>
          </div>
        )}

        {/* Top trend this week */}
        {topTrend && (
          <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Top trend this week</p>
            <p className="text-sm font-medium text-foreground line-clamp-2">{topTrend.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>r/{topTrend.subreddit}</span>
              <span className="flex items-center gap-0.5">
                <TrendUp className="size-3 text-success" weight="bold" />
                {topTrend.upvotes}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="text-xs bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => handlePostAction(topTrend)}
              >
                Create Post
                <ArrowSquareOut className="ml-1 size-3.5" weight="bold" />
              </Button>
            </div>
          </div>
        )}

        {/* Remaining actionable posts */}
        {actionablePosts.slice(1, 4).map((post) => (
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
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <TrendUp className="size-3 text-success" weight="bold" />
                      {post.upvotes}
                    </span>
                  </div>
                </div>
                {post.relevanceScore != null && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", getRelevanceBadgeClass(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason)))}
                  >
                    {getRelevanceLabel(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason))}
                  </Badge>
                )}
              </div>
              {post.suggestedAction && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 gap-1.5 text-xs text-foreground font-medium hover:text-brand transition-colors"
                  onClick={() => handlePostAction(post)}
                >
                  {getActionIcon(post.suggestedAction)}
                  <span>{post.suggestedAction}</span>
                </Button>
              )}
            </div>
            <Separator className="mt-3" />
          </div>
        ))}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/reddit/trending">
                View All Trends
                <ArrowSquareOut className="ml-1 size-4" weight="bold" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={triggering}
            >
              {isProgressing
                ? `${jobStatus?.phase === "scraping" ? "Scraping" : "Analyzing"}... ${jobStatus?.progress}%`
                : triggering
                  ? "Starting..."
                  : "Refresh"}
            </Button>
          </div>
        </div>
      </CardContent>

      <ActionHandoffDialog
        post={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
