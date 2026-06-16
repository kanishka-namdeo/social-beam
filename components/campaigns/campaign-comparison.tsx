"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CampaignMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  avgEngagementRate: number;
}

interface CampaignComparison {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  postCount: number;
  phaseCount: number;
  metrics: CampaignMetrics;
  topPost: {
    postId: string;
    title: string | null;
    engagement: number;
  } | null;
}

interface CampaignComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignIds: string[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CampaignComparisonDialog({ open, onOpenChange, campaignIds }: CampaignComparisonDialogProps) {
  const [campaigns, setCampaigns] = useState<CampaignComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || campaignIds.length === 0) return;

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/campaigns/compare?ids=${campaignIds.join(",")}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch comparison data");
        }
        const data = await res.json();
        setCampaigns(data.campaigns);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load comparison");
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [open, campaignIds]);

  const getBestValue = (metric: keyof CampaignMetrics): number => {
    if (campaigns.length === 0) return 0;
    return Math.max(...campaigns.map((c) => c.metrics[metric]));
  };

  const renderMetricRow = (
    label: string,
    metric: keyof CampaignMetrics,
    format: (val: number) => string = formatNumber
  ) => {
    const bestValue = getBestValue(metric);

    return (
      <TableRow>
        <TableCell className="font-medium text-foreground">{label}</TableCell>
        {campaigns.map((campaign) => {
          const value = campaign.metrics[metric];
          const isBest = value === bestValue && value > 0;
          return (
            <TableCell
              key={campaign.id}
              className={cn(
                "text-right",
                isBest && "font-semibold text-success"
              )}
            >
              {format(value)}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Comparison</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="space-y-6">
            {/* Basic Info Table */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Overview</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    {campaigns.map((c) => (
                      <TableHead key={c.id} className="text-right">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Status</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.status}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Start Date</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {formatDate(c.startDate)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">End Date</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {formatDate(c.endDate)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Duration</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.duration !== null ? `${c.duration} days` : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total Posts</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.postCount}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Phases</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.phaseCount}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Analytics Metrics Table */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Analytics</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Metric</TableHead>
                    {campaigns.map((c) => (
                      <TableHead key={c.id} className="text-right">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderMetricRow("Impressions", "impressions")}
                  {renderMetricRow("Reach", "reach")}
                  {renderMetricRow("Total Engagement", "engagement")}
                  {renderMetricRow("Likes", "likes")}
                  {renderMetricRow("Comments", "comments")}
                  {renderMetricRow("Shares", "shares")}
                  {renderMetricRow("Clicks", "clicks")}
                  {renderMetricRow("Saves", "saves")}
                  {renderMetricRow("Avg Engagement Rate", "avgEngagementRate", (val) => `${(val * 100).toFixed(2)}%`)}
                </TableBody>
              </Table>
            </div>

            {/* Top Posts */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Top Performing Post</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Campaign</TableHead>
                    {campaigns.map((c) => (
                      <TableHead key={c.id} className="text-right">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Post Title</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.topPost?.title || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Engagement</TableCell>
                    {campaigns.map((c) => (
                      <TableCell key={c.id} className="text-right">
                        {c.topPost ? formatNumber(c.topPost.engagement) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
