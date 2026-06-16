"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Spinner, CopySimple, ArrowsClockwise } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignBuilder } from "./campaign-builder";
import { CampaignComparisonDialog } from "./campaign-comparison";
import { LimitedFeatureWrapper } from "@/components/dashboard/limited-feature-wrapper";
import { cn } from "@/lib/utils";

interface CampaignPhase {
  id: string;
  name: string;
  phase: string;
  order: number;
  _count: { posts: number };
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  audience: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  createdAt: string;
  phases: CampaignPhase[];
  _count: { phases: number };
}

interface CampaignListClientProps {
  initialCampaigns: Campaign[];
  userRole: string;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  ARCHIVED: "secondary",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CampaignCard({ campaign, onDelete, onClone, compareMode, selected, onToggleSelect }: { campaign: Campaign; onDelete: (id: string) => void; onClone: () => void; compareMode: boolean; selected: boolean; onToggleSelect: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [, startTransition] = useTransition();

  const handleDelete = async () => {
    setDeleting(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast.error("Failed to delete campaign");
          return;
        }
        toast.success("Campaign deleted");
        onDelete(campaign.id);
      } catch {
        toast.error("Failed to delete campaign");
      } finally {
        setDeleting(false);
      }
    });
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/clone`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Failed to clone campaign");
        return;
      }
      toast.success("Campaign cloned");
      onClone();
    } catch {
      toast.error("Failed to clone campaign");
    } finally {
      setCloning(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card p-4 space-y-3 hover:bg-muted/30 transition-colors",
        compareMode && selected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {compareMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(campaign.id)}
                className="size-4 cursor-pointer"
              />
            )}
            <h3 className="text-sm font-semibold text-foreground truncate">{campaign.name}</h3>
            <Badge variant={STATUS_BADGE_VARIANT[campaign.status] ?? "secondary"}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatDate(campaign.createdAt)}</span>
        {campaign.duration && (
          <span>{campaign.duration}</span>
        )}
        <span className="flex items-center gap-1">
          <Megaphone className="size-3" />
          {campaign._count.phases} {campaign._count.phases === 1 ? "phase" : "phases"}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => window.location.href = `/campaigns/${campaign.id}`}
        >
          View
        </Button>
        {!compareMode && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              disabled={cloning}
              onClick={handleClone}
              aria-label="Clone campaign"
            >
              {cloning ? (
                <Spinner className="size-3 animate-spin" />
              ) : (
                <CopySimple className="size-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Spinner className="size-3 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-sm border border-dashed border-border bg-card p-12 text-center space-y-3">
      <Megaphone className="size-10 text-muted-foreground mx-auto" />
      <h3 className="text-sm font-medium text-foreground">No campaigns yet</h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Create your first campaign to get started with multi-phase, AI-powered content generation.
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

function FilteredCampaignList({
  campaigns,
  filter,
  onDelete,
  onClone,
  compareMode,
  selectedIds,
  onToggleSelect,
}: {
  campaigns: Campaign[];
  filter: string;
  onDelete: (id: string) => void;
  onClone: () => void;
  compareMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const filtered =
    filter === "ALL"
      ? campaigns
      : campaigns.filter((c) => c.status === filter);

  if (filtered.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No {filter === "ALL" ? "" : filter.toLowerCase()} campaigns found.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((c) => (
        <CampaignCard
          key={c.id}
          campaign={c}
          onDelete={onDelete}
          onClone={onClone}
          compareMode={compareMode}
          selected={selectedIds.has(c.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

export function CampaignListClient({ initialCampaigns, userRole }: CampaignListClientProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isLoading, setIsLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const isPremium = userRole === "PREMIUM_USER" || userRole === "ADMIN";

  const handleDelete = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const handleExitCompare = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  const handleCompareSelected = () => {
    if (selectedIds.size >= 2) {
      setComparisonOpen(true);
    }
  };

  const refetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const json = await res.json();
        const fetched: Campaign[] = json.data ?? json ?? [];
        setCampaigns(fetched);
      }
    } catch {
      toast.error("Failed to refresh campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs defaultValue="ALL" className="gap-0">
          <TabsList className="h-8">
            {STATUS_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={handleExitCompare}
              >
                Cancel
              </Button>
              {selectedIds.size >= 2 && (
                <Button
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleCompareSelected}
                >
                  <ArrowsClockwise className="mr-1 size-3" />
                  Compare {selectedIds.size} Selected
                </Button>
              )}
              {selectedIds.size > 0 && selectedIds.size < 2 && (
                <span className="text-xs text-muted-foreground">
                  Select at least 2 campaigns
                </span>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setCompareMode(true)}
              disabled={campaigns.length < 2}
            >
              <ArrowsClockwise className="mr-1 size-3" />
              Compare
            </Button>
          )}

          {isPremium ? (
            <CampaignBuilder onCreated={refetchCampaigns} />
          ) : (
            <LimitedFeatureWrapper
              featureName="Campaign Builder"
              featureKey="campaign-builder"
              isPremium={false}
            >
              <CampaignBuilder onCreated={refetchCampaigns} />
            </LimitedFeatureWrapper>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <Tabs defaultValue="ALL">
          {STATUS_OPTIONS.map((opt) => (
            <TabsContent key={opt.value} value={opt.value} className="mt-0">
              <FilteredCampaignList
                campaigns={campaigns}
                filter={opt.value}
                onDelete={handleDelete}
                onClone={refetchCampaigns}
                compareMode={compareMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <CampaignComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        campaignIds={Array.from(selectedIds)}
      />
    </div>
  );
}
