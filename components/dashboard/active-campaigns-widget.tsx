"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, ArrowRight } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface CampaignPhaseInfo {
  id: string;
  name: string;
  phase: string;
  order: number;
  _count: { posts: number };
}

interface ActiveCampaign {
  id: string;
  name: string;
  status: string;
  phases: CampaignPhaseInfo[];
  _count: { phases: number };
}

interface ActiveCampaignsWidgetProps {
  size?: WidgetSizeToken;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-success/10 text-success" },
  DRAFT: { label: "Draft", className: "bg-muted/10 text-muted-foreground" },
  COMPLETED: { label: "Completed", className: "bg-info/10 text-info" },
  ARCHIVED: { label: "Archived", className: "bg-muted/10 text-muted-foreground" },
};

export function ActiveCampaignsWidget({ size = "5x3" }: ActiveCampaignsWidgetProps) {
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { isWide } = getSizeDerivatives(size);

  useEffect(() => {
    const ac = new AbortController();
    void fetch(`/api/campaigns?status=ACTIVE&limit=3`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!ac.signal.aborted) {
          setCampaigns(data.data ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => { ac.abort(); };
  }, []);

  return (
    <BaseWidget
      size={size}
      isLoading={loading}
      isEmpty={!loading && campaigns.length === 0}
      emptyState={{
        icon: <Megaphone className="size-8" weight="light" />,
        message: "No active campaigns",
        description: "Create a campaign to get started.",
        cta: {
          label: "Create Campaign",
          href: "/dashboard/campaigns",
        },
      }}
      header={{
        title: "Active Campaigns",
        icon: <Megaphone className="size-4 text-brand" weight="bold" />,
      }}
    >
      {loading ? (
        <div className="space-y-control">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-section rounded-sm border border-border p-card">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-control", isWide ? "grid-cols-2" : "grid-cols-1")}>
          {campaigns.map((campaign) => {
            const cfg = statusConfig[campaign.status] ?? statusConfig.DRAFT;
            const totalPhases = campaign._count?.phases ?? campaign.phases.length;
            const totalPosts = campaign.phases.reduce(
              (sum, p) => sum + (p._count?.posts ?? 0),
              0,
            );

            return (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className={cn(
                  "flex flex-col gap-control rounded-sm border border-subtle bg-surface-1 p-card hover-lift hover:bg-surface-2 transition-colors",
                )}
              >
                <div className="flex items-start justify-between gap-control">
                  <span className="text-body font-medium text-foreground truncate flex-1">
                    {campaign.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-caption rounded-sm shrink-0", cfg.className)}
                  >
                    {cfg.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>{totalPhases} phase{totalPhases !== 1 ? "s" : ""}</span>
                  <span>{totalPosts} post{totalPosts !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="mt-panel flex justify-end">
          <Link
            href="/dashboard/campaigns"
            className="flex items-center gap-tight text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            View all campaigns
            <ArrowRight className="size-3" weight="bold" />
          </Link>
        </div>
      )}
    </BaseWidget>
  );
}
