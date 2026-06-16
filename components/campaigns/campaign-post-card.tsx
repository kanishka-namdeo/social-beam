"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/oauth/platform-icons";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner, Check, X, ArrowsClockwise } from "@phosphor-icons/react/ssr";

interface CampaignPostCardProps {
  post: {
    id: string;
    status: string;
    scheduledAt?: string | null;
    variantIndex?: number;
    qualityScore?: number;
    approvalStatus?: string;
    PostPlatform: Array<{
      platform: string;
      content: string;
    }>;
  };
  campaignId: string;
  phaseId?: string;
  requireApproval?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-muted-foreground bg-secondary/50",
  SCHEDULED: "text-info bg-info/10",
  PUBLISHED: "text-success bg-success/10",
  FAILED: "text-destructive bg-destructive/10",
};

export function CampaignPostCard({ post, campaignId, phaseId, requireApproval }: CampaignPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activePlatformIdx, setActivePlatformIdx] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalState, setApprovalState] = useState(post.approvalStatus ?? "pending");
  const [recycling, setRecycling] = useState(false);

  const platforms = post.PostPlatform;
  if (platforms.length === 0) return null;

  const currentPlatform = platforms[activePlatformIdx] ?? platforms[0];
  const content = currentPlatform.content ?? "";
  const displayContent = expanded ? content : content.slice(0, 200);
  const isTruncated = content.length > 200;

  const qualityScore = post.qualityScore ?? 0;
  const qualityColor = qualityScore > 70 ? "bg-success/10 text-success" : qualityScore >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
  const variantLabel = post.variantIndex === 1 ? "Variant B" : "Variant A";

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const platformNames = platforms.map((p) => p.platform);
      const res = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, platforms: platformNames }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      toast.success("Post regeneration started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSchedule = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId }),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      toast.success("Post scheduled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    }
  };

  const handleApproval = async (status: "approved" | "rejected") => {
    setApproving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/posts/${post.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update approval");
      setApprovalState(status);
      toast.success(status === "approved" ? "Post approved" : "Post rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update approval");
    } finally {
      setApproving(false);
    }
  };

  const handleRecycle = async (variation: "light" | "medium" | "heavy") => {
    setRecycling(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/posts/${post.id}/recycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variation }),
      });
      if (!res.ok) throw new Error("Failed to recycle post");
      const data = await res.json();
      toast.success(`Post recycled successfully! New post ID: ${data.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to recycle post");
    } finally {
      setRecycling(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {platforms.map((p, idx) => (
            <button
              key={p.platform}
              type="button"
              onClick={() => setActivePlatformIdx(idx)}
              className={cn(
                "rounded-sm px-2 py-0.5 text-xs font-medium transition-colors min-h-6",
                idx === activePlatformIdx
                  ? "bg-brand/10 text-brand"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
              )}
            >
              {PLATFORM_DISPLAY_NAMES[p.platform] ?? p.platform}
            </button>
          ))}
          <Badge variant="secondary" className="text-xs">{variantLabel}</Badge>
          <Badge variant="secondary" className={cn("text-xs", qualityColor)}>
            Quality: {qualityScore}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {requireApproval && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                approvalState === "approved" && "bg-success/10 text-success",
                approvalState === "rejected" && "bg-destructive/10 text-destructive",
                approvalState === "pending" && "bg-warning/10 text-warning"
              )}
            >
              {approvalState}
            </Badge>
          )}
          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[post.status] ?? "")}>
            {post.status}
          </Badge>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {displayContent}
          {!expanded && isTruncated && "..."}
        </p>
        {isTruncated && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-auto p-0 text-xs text-brand"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating && <Spinner className="mr-1 size-3 animate-spin" />}
          {regenerating ? "Regenerating..." : "Regenerate"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={handleSchedule}
        >
          Schedule
        </Button>
        {post.status === "PUBLISHED" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={recycling}
              >
                {recycling ? (
                  <>
                    <Spinner className="mr-1 size-3 animate-spin" />
                    Recycling...
                  </>
                ) : (
                  <>
                    <ArrowsClockwise className="mr-1 size-3" />
                    Recycle
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Variation Level</p>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => handleRecycle("light")}
                  >
                    Light - Minor rewording
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => handleRecycle("medium")}
                  >
                    Medium - Different angle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => handleRecycle("heavy")}
                  >
                    Heavy - Fresh take
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {requireApproval && approvalState === "pending" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-success border-success/30 hover:bg-success/10"
              onClick={() => handleApproval("approved")}
              disabled={approving}
            >
              <Check className="mr-1 size-3" weight="bold" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => handleApproval("rejected")}
              disabled={approving}
            >
              <X className="mr-1 size-3" weight="bold" />
              Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
