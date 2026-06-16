"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Trash, Copy, Clock, Warning, Play } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PhaseTimeline } from "./phase-timeline";
import { CampaignPostCard } from "./campaign-post-card";
import { CampaignAnalytics } from "./campaign-analytics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UserRole } from "@/lib/role-guard";

interface CampaignPhasePost {
  id: string;
  platform: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  variantIndex?: number;
  qualityScore?: number;
  approvalStatus?: string;
  PostPlatform: Array<{
    platform: string;
    content: string;
  }>;
}

interface CampaignPhase {
  id: string;
  name: string;
  description: string | null;
  type: string;
  order: number;
  posts: CampaignPhasePost[];
}

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  audience: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  requireApproval?: boolean;
}

interface CampaignDetailClientProps {
  campaign: CampaignDetail;
  phases: CampaignPhase[];
  userRole: UserRole;
}

interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-success/10 text-success",
  COMPLETED: "bg-info/10 text-info",
  ARCHIVED: "bg-muted text-muted-foreground",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatActivityLabel(activity: ActivityItem): string {
  const d = activity.details ?? {};
  switch (activity.action) {
    case "created":
      return "Campaign created";
    case "status_changed":
      return `Status changed: ${String(d.from ?? "—")} → ${String(d.to ?? "—")}`;
    case "posts_generated":
      return `Generated ${String(d.count ?? "?")} posts`;
    case "published":
      return "Campaign published";
    case "cloned":
      return "Campaign cloned";
    default:
      return activity.action;
  }
}

function ActivityTimeline({ campaignId }: { campaignId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/activity`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((json) => setActivities(json.activities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { ac.abort(); };
  }, [campaignId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-3 rounded-full shrink-0 mt-1" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex items-start gap-3">
            <div className="absolute left-[-11px] top-1.5 size-2.5 rounded-full bg-primary border border-border" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">{formatActivityLabel(activity)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CampaignDetailClient({ campaign, phases, userRole }: CampaignDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [activePhaseId, setActivePhaseId] = useState<string>(phases[0]?.id ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const requireApproval = campaign.requireApproval ?? false;

  const allPosts = phases.flatMap((p) => p.posts);
  const totalPosts = allPosts.length;
  const approvedPosts = allPosts.filter((p) => p.approvalStatus === "approved").length;

  const [isResuming, setIsResuming] = useState(false);
  const [resumeProgress, setResumeProgress] = useState(0);
  const [resumeStatus, setResumeStatus] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const expectedVariants = 2;
  const expectedPlatforms = phases[0]?.posts[0]?.PostPlatform?.length ?? 1;
  const expectedPostsPerPhase = expectedVariants * expectedPlatforms;

  const missingPhaseIds = useMemo(
    () => phases.filter((p) => p.posts.length === 0).map((p) => p.id),
    [phases],
  );

  const incompletePhaseIds = useMemo(
    () => phases.filter((p) => p.posts.length > 0 && p.posts.length < expectedPostsPerPhase).map((p) => p.id),
    [phases, expectedPostsPerPhase],
  );

  const phasesToResume = missingPhaseIds.length > 0 ? missingPhaseIds : incompletePhaseIds;

  const hasPartialGeneration =
    campaign.status === "DRAFT" && totalPosts > 0 && phasesToResume.length > 0;

  const handleResumeGeneration = async () => {
    if (phasesToResume.length === 0) return;

    setIsResuming(true);
    setResumeProgress(0);
    setResumeStatus(`Resuming ${phasesToResume.length} phase(s)...`);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let completedPhases = 0;
      const totalPhases = phasesToResume.length;

      for (const phaseId of phasesToResume) {
        if (controller.signal.aborted) return;

        const phaseName = phases.find((p) => p.id === phaseId)?.name ?? "phase";
        setResumeStatus(`Generating ${phaseName}...`);

        const generateRes = await fetch(`/api/campaigns/${campaign.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phaseId, platforms: ["linkedin", "x", "instagram", "facebook", "tiktok", "pinterest", "youtube", "threads", "googleBusiness", "bluesky"] }),
          signal: controller.signal,
        });

        if (!generateRes.ok) {
          toast.error(`Failed to generate ${phaseName}`);
          setIsResuming(false);
          return;
        }

        const reader = generateRes.body?.getReader();
        if (!reader) {
          toast.error("Streaming not supported");
          setIsResuming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let phaseComplete = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          let currentData: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              currentData.push(line.slice(5).trim());
            } else if (line.trim() === "") {
              if (currentEvent || currentData.length > 0) {
                const dataStr = currentData.join("\n");
                try {
                  if (currentEvent === "complete") {
                    phaseComplete = true;
                  } else if (currentEvent === "error") {
                    const data = JSON.parse(dataStr);
                    toast.error(data.error ?? "Generation failed");
                    setIsResuming(false);
                    return;
                  }
                } catch (err) {
                  console.error("SSE parse error:", err);
                }
                currentEvent = "";
                currentData = [];
              }
            }
          }
        }

        if (phaseComplete) {
          completedPhases++;
          setResumeProgress((completedPhases / totalPhases) * 100);
        }
      }

      setResumeProgress(100);
      setResumeStatus("Generation complete!");
      toast.success("Campaign generation resumed successfully");
      setTimeout(() => {
        setIsResuming(false);
        router.refresh();
      }, 500);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Generation cancelled");
      } else {
        console.error("Resume generation error:", err);
        toast.error("Network error during generation");
      }
    } finally {
      setIsResuming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelResume = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      toast.success("Campaign deleted");
      window.location.href = "/campaigns";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = useCallback(async () => {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/clone`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clone campaign");
      const json = await res.json();
      const newId = json.campaign?.id;
      toast.success("Campaign cloned");
      if (newId) {
        router.push(`/campaigns/${newId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone campaign");
    } finally {
      setIsCloning(false);
    }
  }, [campaign.id, router]);

  const timelinePhases = phases.map((p) => ({
    id: p.id,
    name: p.name,
    phase: p.type,
    order: p.order,
    posts: p.posts.map((post) => ({ id: post.id })),
  }));

  const activePhase = phases.find((p) => p.id === activePhaseId);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return "Not set";
    if (duration === "custom") {
      return `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`;
    }
    const match = duration.match(/^(\d+)/);
    if (match) {
      const days = parseInt(match[1], 10);
      return `${days} ${days === 1 ? "day" : "days"}`;
    }
    return duration;
  };

  const getVariantCount = (phase: CampaignPhase) => {
    const indices = new Set(phase.posts.map((p) => p.variantIndex ?? 0));
    return indices.size;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Megaphone className="size-5 text-brand" weight="fill" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {campaign.name}
              </h1>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0",
                  STATUS_COLORS[campaign.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>
            )}
            {requireApproval && totalPosts > 0 && (
              <p className="text-xs text-muted-foreground">
                {approvedPosts} of {totalPosts} posts approved
                {approvedPosts < totalPosts && (
                  <Warning className="inline size-3 ml-1 text-warning" weight="fill" />
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-10">
            <Pencil className="mr-1.5 size-4" weight="regular" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={handleClone}
            disabled={isCloning}
          >
            {isCloning ? (
              <span className="flex items-center gap-1.5">
                <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                Cloning...
              </span>
            ) : (
              <>
                <Copy className="mr-1.5 size-4" weight="regular" />
                Clone
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash className="mr-1.5 size-4" weight="regular" />
            Delete
          </Button>
        </div>
      </div>

      {/* Resume generation banner */}
      {hasPartialGeneration && !isResuming && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warning className="size-5 text-warning" weight="fill" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Generation incomplete
                </p>
                <p className="text-xs text-muted-foreground">
                  {missingPhaseIds.length > 0
                    ? `${missingPhaseIds.length} phase(s) missing posts`
                    : `${incompletePhaseIds.length} phase(s) incomplete`}
                </p>
              </div>
            </div>
            <Button onClick={handleResumeGeneration} size="sm">
              <Play className="mr-1.5 size-4" />
              Resume Generation
            </Button>
          </CardContent>
        </Card>
      )}

      {isResuming && (
        <Card className="border-brand bg-brand/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{resumeStatus}</p>
              <Button variant="ghost" size="sm" onClick={handleCancelResume}>
                Cancel
              </Button>
            </div>
            <Progress value={resumeProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium text-foreground">{formatDuration(campaign.duration)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Phases</p>
            <p className="text-sm font-medium text-foreground">{phases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Posts</p>
            <p className="text-sm font-medium text-foreground">
              {phases.reduce((sum, p) => sum + p.posts.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Start: {formatDate(campaign.startDate)}</span>
        <span>End: {formatDate(campaign.endDate)}</span>
      </div>

      {/* Phase timeline */}
      {phases.length > 0 && (
        <PhaseTimeline
          phases={timelinePhases}
          activePhaseId={activePhaseId}
          onPhaseClick={setActivePhaseId}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts ({phases.reduce((a, p) => a + p.posts.length, 0)})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {campaign.goal && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Goal</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground">{campaign.goal}</p>
              </CardContent>
            </Card>
          )}
          {campaign.audience && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">Target Audience</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground">{campaign.audience}</p>
              </CardContent>
            </Card>
          )}
          {activePhase && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">
                  Current Phase: {activePhase.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {activePhase.description && (
                  <p className="text-sm text-muted-foreground">{activePhase.description}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {activePhase.posts.slice(0, 4).map((post) => (
                    <CampaignPostCard
                      key={post.id}
                      post={post}
                      campaignId={campaign.id}
                      phaseId={activePhase.id}
                      requireApproval={requireApproval}
                    />
                  ))}
                </div>
                {activePhase.posts.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("posts")}
                    className="min-h-10"
                  >
                    View all {activePhase.posts.length} posts →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <div className="space-y-6">
            {phases.map((phase) => {
              const variantCount = getVariantCount(phase);
              return (
                <div key={phase.id} className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    {phase.name}
                    <Badge variant="secondary" className="text-xs">{phase.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({phase.posts.length} posts{variantCount > 1 ? `, ${variantCount} variants` : ""})
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {phase.posts.map((post) => (
                      <CampaignPostCard
                        key={post.id}
                        post={post}
                        campaignId={campaign.id}
                        phaseId={phase.id}
                        requireApproval={requireApproval}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <CampaignAnalytics campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline campaignId={campaign.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
