"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Sparkle, TrendUp, ChatText, Plus, ArrowRight, Gear } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { getRelevanceBadgeClass } from "@/lib/reddit/types";
import { getActionIcon } from "@/lib/reddit/ui-helpers";

const SAMPLE_TRENDS = [
  {
    title: "AI marketing tools that actually work in 2026",
    subreddit: "marketing",
    upvotes: 2400,
    comments: 340,
    relevance: 0.89,
    action: "Create content",
    reason: "Directly relevant to your AI-focused brand — high engagement from your target audience.",
  },
  {
    title: "Why we stopped posting at 9am and started posting at 2pm",
    subreddit: "socialmedia",
    upvotes: 1800,
    comments: 210,
    relevance: 0.72,
    action: "Comment on this post",
    reason: "Timing optimization discussion aligns with your scheduling tool positioning.",
  },
  {
    title: "The best content repurposing workflow I've found",
    subreddit: "entrepreneur",
    upvotes: 950,
    comments: 87,
    relevance: 0.65,
    action: "Share with your audience",
    reason: "Content repurposing is a trending topic — great for thought leadership.",
  },
];

interface TrendingEmptyStateProps {
  hasSubreddits: boolean;
  onOpenManager?: () => void;
}

export function TrendingEmptyState({ hasSubreddits, onOpenManager }: TrendingEmptyStateProps) {
  const router = useRouter();
  const [triggering, setTriggering] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [addingSubreddit, setAddingSubreddit] = useState<string | null>(null);
  const [jobPhase, setJobPhase] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling timeout on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const pollForJobStatus = useCallback(async (jobId: string, maxPolls = 40) => {
    let polls = 0;
    const poll = async () => {
      polls++;
      if (polls > maxPolls) {
        if (pollRef.current) clearTimeout(pollRef.current);
        setTriggering(false);
        setScrapingProgress(0);
        router.refresh();
        return;
      }

      try {
        const res = await fetch(`/api/reddit/trending/status?jobId=${jobId}`);
        if (res.ok) {
          const json = await res.json();
          const status = json.data;
          setJobPhase(status.phase);
          setScrapingProgress(status.progress);

          if (status.phase === "done" || status.phase === "error") {
            if (pollRef.current) clearTimeout(pollRef.current);
            setTriggering(false);
            setScrapingProgress(0);
            setJobPhase(null);
            router.refresh();
            if (status.phase === "done") {
              toast.success(status.message ?? "Scrape complete");
            } else {
              toast.error("Scrape failed — try again");
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

  const handleTriggerScrape = async () => {
    setTriggering(true);
    setScrapingProgress(0);
    setJobPhase("scraping");
    try {
      const res = await fetch("/api/reddit/trending/trigger", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.jobId) {
        toast.success(json.data.message);
        void pollForJobStatus(json.data.jobId);
      } else {
        toast.error(json.error ?? "Failed to trigger scrape");
        setTriggering(false);
        setJobPhase(null);
      }
    } catch {
      toast.error("Failed to trigger scrape");
      setTriggering(false);
      setJobPhase(null);
    }
  };

  const handleQuickAdd = async (subreddit: string) => {
    setAddingSubreddit(subreddit);
    try {
      const res = await fetch("/api/reddit/subreddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit, sortOrder: "hot" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Now tracking r/${subreddit}`);
        window.location.reload();
      } else if (res.status === 409) {
        toast.error(json.error ?? "Already tracked");
      } else {
        toast.error(json.error ?? "Failed to add subreddit");
      }
    } catch {
      toast.error("Failed to add subreddit");
    } finally {
      setAddingSubreddit(null);
    }
  };

  if (!hasSubreddits) {
    return (
      <Card className="bg-ai-surface/50 border-ai-surface">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Track trending discussions
          </CardTitle>
          <CardDescription>
            Add subreddits to discover trending topics relevant to your brand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Worked example */}
          <div className="rounded-sm border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Here&apos;s what you&apos;ll see once you add subreddits:
            </p>
            <div className="space-y-3">
              {SAMPLE_TRENDS.map((trend, i) => (
                <div key={i}>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {trend.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>r/{trend.subreddit}</span>
                      <span className="flex items-center gap-0.5">
                        <TrendUp className="size-3 text-success" weight="bold" />
                        {trend.upvotes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <ChatText className="size-3" weight="bold" />
                        {trend.comments}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getRelevanceBadgeClass(trend.relevance))}
                      >
                        {(trend.relevance * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      {getActionIcon(trend.action)}
                      <span>{trend.action}</span>
                    </div>
                  </div>
                  {i < SAMPLE_TRENDS.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* Quick-add popular subreddits */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Quick start — track a popular subreddit:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TRENDS.slice(0, 3).map((trend) => (
                <Badge
                  key={trend.subreddit}
                  variant="outline"
                  className="cursor-pointer hover:bg-brand/5 hover:border-brand/30 text-xs"
                  onClick={() => handleQuickAdd(trend.subreddit)}
                >
                  {addingSubreddit === trend.subreddit ? (
                    <>
                      <Sparkle className="size-3 mr-1 animate-spin" weight="fill" />
                      Adding r/{trend.subreddit}...
                    </>
                  ) : (
                    <>
                      <Plus className="size-3 mr-1" weight="bold" />
                      Track r/{trend.subreddit}
                    </>
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {onOpenManager ? (
                <Button variant="outline" onClick={onOpenManager} disabled={triggering}>
                  <Gear className="size-4 mr-1.5" weight="bold" />
                  Manage Subreddits
                </Button>
              ) : (
                <Button variant="outline" asChild disabled={triggering}>
                  <a href="#manage-subreddits">
                    <Gear className="size-4 mr-1.5" weight="bold" />
                    Manage Subreddits
                  </a>
                </Button>
              )}
            </div>

            {triggering && (
              <div className="rounded-sm border border-brand/20 bg-brand/5 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {jobPhase === "analyzing" ? "Analyzing with AI..." : "Scraping Reddit..."}
                  </span>
                  <span className="text-muted-foreground">{scrapingProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-brand/10 rounded-sm overflow-hidden">
                  <Progress value={scrapingProgress} className="h-1.5" />
                </div>
              </div>
            )}
          </div>

          {/* Exposed limits */}
          <p className="text-xs text-muted-foreground">
            SocialBeam scrapes your subreddits every 2 hours and analyzes each post with AI for relevance to your brand.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-ai-surface/50 border-ai-surface">
      <CardHeader>
        <CardTitle className="text-base">No data yet</CardTitle>
        <CardDescription>
          Your subreddits are configured. Trigger your first scrape to start finding trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Starting verb */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="default"
            onClick={handleTriggerScrape}
            disabled={triggering}
          >
            {triggering ? (
              <>
                <Sparkle className="size-4 mr-1.5 animate-spin" weight="fill" />
                Scraping... {scrapingProgress}%
              </>
            ) : (
              <>
                Trigger First Scrape
                <ArrowRight className="size-4 ml-1.5" weight="bold" />
              </>
            )}
          </Button>
        </div>

        {/* Exposed limits */}
        <p className="text-xs text-muted-foreground">
          The scrape takes about 30 seconds per subreddit. After analysis, you&apos;ll see trending posts here ranked by AI relevance.
        </p>
      </CardContent>
    </Card>
  );
}
