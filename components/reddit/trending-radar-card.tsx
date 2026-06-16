"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowSquareOut, Sparkle, TrendUp } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { ActionHandoffDialog } from "./action-handoff-dialog";
import { BrandReasonPill } from "./brand-reason-breakdown";
import { TrendPhaseBadge } from "./trend-phase-badge";
import type { TrendingPost } from "@/lib/reddit/types";
import { getRelevanceBadgeClass, getRelevanceLabel, isAiAnalysisFailed } from "@/lib/reddit/types";
import { getActionIcon } from "@/lib/reddit/ui-helpers";

type WidgetSize = "5x3" | "5x4" | "10x3";

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
  size?: WidgetSize;
}

export function TrendingRadarCard({ posts, isLoading, size = "5x3" }: TrendingRadarCardProps) {
  const isWide = size === "10x3";
  const maxPosts = size === "5x3" ? 3 : size === "5x4" ? 5 : 8;
  const router = useRouter();
  const actionablePosts = posts.filter((p) => p.isActionable).slice(0, 5);
  const topTrend = actionablePosts.length > 0 ? actionablePosts[0] : null;
  const [triggering, setTriggering] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [selectedPost, setSelectedPost] = useState<TrendingPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup polling timeout and abort in-flight requests on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const pollForJobStatus = useCallback(async (jobId: string, maxPolls = 40) => {
    let polls = 0;
    const poll = async () => {
      polls++;
      if (polls > maxPolls) {
        if (pollRef.current) clearTimeout(pollRef.current);
        if (!mountedRef.current) return;
        router.refresh();
        return;
      }

      // Abort previous poll request before starting new one
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`/api/reddit/trending/status?jobId=${jobId}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (res.ok) {
          const json = await res.json();
          const status: JobStatus = json.data;
          if (!mountedRef.current) return;
          setJobStatus(status);

          if (status.phase === "done" || status.phase === "error") {
            if (pollRef.current) clearTimeout(pollRef.current);
            if (!mountedRef.current) return;
            setTriggering(false);
            setJobStatus(null);
            router.refresh();
            if (status.phase === "done") {
              toast.success(status.message ?? "Scrape complete");
            }
            return;
          }
        }
      } catch (err) {
        // AbortError is expected on cleanup, ignore it
        if (abortControllerRef.current?.signal.aborted) return;
        // Silently continue polling for other errors
      }

      if (!mountedRef.current) return;
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

  const isProgressing = triggering && jobStatus != null;
  const isEmpty = posts.length === 0;

  const description = isEmpty
    ? "Discover trending topics to inspire your next post"
    : `${actionablePosts.length} actionable trends found in the last 24 hours`;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      header={{
        title: "Trending Radar",
        icon: <Sparkle weight="fill" />,
        description,
      }}
      isLoading={isLoading}
      className="border-ai-surface bg-ai-surface/50 border-l-2 border-l-brand"
    >
      {isEmpty ? (
        <div className="rounded-sm border border-dashed border-border p-6 text-center space-y-3">
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
      ) : (
        <div className="space-y-3">
          {/* Progress indicator */}
          {isProgressing && (
            <div className="rounded-sm border border-brand/20 bg-brand/5 p-3 space-y-2">
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
            <div className="rounded-sm border border-brand/20 bg-brand/5 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Top trend this week</p>
              <div className="flex items-start gap-2">
                <p className="text-sm font-medium text-foreground truncate-2 flex-1">{topTrend.title}</p>
                {topTrend.trendPhase && (
                  <TrendPhaseBadge phase={topTrend.trendPhase} className="shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>r/{topTrend.subreddit}</span>
                <span className="flex items-center gap-0.5 tabular-nums">
                  <TrendUp className="size-3 text-success" weight="bold" />
                  <span className="tabular-nums">{topTrend.upvotes}</span>
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
          {actionablePosts.slice(1, maxPosts).map((post) => (
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
                      <span className="text-xs text-muted-foreground flex-center gap-0.5 tabular-nums">
                        <TrendUp className="size-3 text-success" weight="bold" />
                        <span className="tabular-nums">{post.upvotes}</span>
                      </span>
                    </div>
                  </div>
                  {post.relevanceScore != null && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {post.brandReasonTags && post.brandReasonTags.length > 0 && (
                        <BrandReasonPill tag={post.brandReasonTags[0]} />
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", getRelevanceBadgeClass(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason)))}
                      >
                        {getRelevanceLabel(post.relevanceScore, isAiAnalysisFailed(post.relevanceReason))}
                      </Badge>
                    </div>
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
        </div>
      )}

      {isWide && !isEmpty && (
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/40">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/reddit/trending">
                  View All Trends
                  <ArrowSquareOut className="ml-1 size-4" weight="bold" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ActionHandoffDialog
        post={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </BaseWidget>
  );
}
