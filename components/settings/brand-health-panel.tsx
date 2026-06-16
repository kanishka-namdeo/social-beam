"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ChartBar, Warning, CheckCircle } from "@phosphor-icons/react/ssr";

interface BrandHealthData {
  hasBrandContext: boolean;
  score: number;
  status: "healthy" | "needs_attention" | "stale";
  fieldMetrics: {
    fieldName: string;
    confidence: number;
    stability: number;
    signalCount: number;
  }[];
  signalSummary: {
    total: number;
    applied: number;
    unapplied: number;
    recent7Days: number;
    byType: Record<string, number>;
  };
  lastTrainedAt: string | null;
  trainingStatus: string;
  fieldsNeedingAttention: string[];
}

function ScoreColor({ status }: { status: string }) {
  switch (status) {
    case "healthy":
      return "text-success";
    case "needs_attention":
      return "text-warning";
    case "stale":
    default:
      return "text-destructive";
  }
}

function ScoreBadgeConfig({ status }: { status: string }) {
  switch (status) {
    case "healthy":
      return {
        icon: <CheckCircle className="size-4" weight="fill" />,
        label: "Healthy",
        className: "bg-success/10 text-success border-success/20",
      };
    case "needs_attention":
      return {
        icon: <Warning className="size-4" weight="fill" />,
        label: "Needs Attention",
        className: "bg-warning/10 text-warning border-warning/20",
      };
    case "stale":
    default:
      return {
        icon: <Warning className="size-4" weight="fill" />,
        label: "Stale",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
  }
}

export function BrandHealthPanel() {
  const [health, setHealth] = useState<BrandHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const res = await fetch("/api/brand-context/health");
        if (!res.ok) {
          if (!cancelled) setError("Failed to fetch health data");
          return;
        }
        const json = await res.json();
        if (!cancelled) setHealth(json.data);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                <Heart className="size-5 text-brand" weight="fill" />
                Brand Context Health
              </CardTitle>
              <CardDescription>
                How well your brand profile is performing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-8">
            <Skeleton className="size-24 rounded-sm" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Heart className="size-5 text-brand" weight="fill" />
            Brand Context Health
          </CardTitle>
          <CardDescription>
            How well your brand profile is performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {error ?? "Unable to load health data"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!health.hasBrandContext) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Heart className="size-5 text-muted-foreground" weight="fill" />
            Brand Context Health
          </CardTitle>
          <CardDescription>
            How well your brand profile is performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure brand context to see health metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const badgeConfig = ScoreBadgeConfig({ status: health.status });

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <Heart className="size-5 text-brand" weight="fill" />
              Brand Context Health
            </CardTitle>
            <CardDescription>
              How well your brand profile is performing
            </CardDescription>
          </div>
          <Badge className={cn("rounded-sm", badgeConfig.className)}>
            {badgeConfig.icon}
            {badgeConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Score + Summary Row */}
        <div className="flex flex-col sm:flex-row items-start gap-8">
          {/* Score Circle */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center size-24 rounded-sm border-4",
                health.status === "healthy" && "border-success",
                health.status === "needs_attention" && "border-warning",
                health.status === "stale" && "border-destructive",
              )}
            >
              <span
                className={cn(
                  "text-3xl font-bold",
                  ScoreColor({ status: health.status }),
                )}
              >
                {health.score}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Health Score</span>
          </div>

          {/* Summary Metrics */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ChartBar className="size-4" />
                Signals captured
              </div>
              <p className="text-lg font-semibold text-foreground">
                {health.signalSummary.total}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Warning className="size-4" />
                Unapplied signals
              </div>
              <p className="text-lg font-semibold text-foreground">
                {health.signalSummary.unapplied}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle className="size-4" />
                Last trained
              </div>
              <p className="text-lg font-semibold text-foreground">
                {health.lastTrainedAt
                  ? new Date(health.lastTrainedAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* Fields Needing Attention */}
        {health.fieldsNeedingAttention.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Warning className="size-4 text-warning" weight="fill" />
              Fields Needing Attention
            </h3>
            <div className="space-y-3">
              {health.fieldMetrics
                .filter((f) => f.confidence < 0.4)
                .map((field) => (
                  <div
                    key={field.fieldName}
                    className="flex items-center gap-4"
                  >
                    <span className="text-sm text-foreground min-w-[120px]">
                      {field.fieldName}
                    </span>
                    <Progress
                      value={field.confidence * 100}
                      className={cn(
                        "flex-1 h-2",
                        field.confidence < 0.2 && "[&>[data-slot=progress-indicator]]:bg-destructive",
                        field.confidence >= 0.2 && field.confidence < 0.4 && "[&>[data-slot=progress-indicator]]:bg-warning",
                      )}
                    />
                    <Badge variant="outline" className="text-xs min-h-10 flex items-center">
                      {field.signalCount} signals
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* All Field Metrics */}
        {health.fieldMetrics.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Field Confidence
            </h3>
            <div className="space-y-3">
              {health.fieldMetrics.map((field) => (
                <div
                  key={field.fieldName}
                  className="flex items-center gap-4"
                >
                  <span className="text-sm text-foreground min-w-[120px]">
                    {field.fieldName}
                  </span>
                  <Progress
                    value={field.confidence * 100}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {Math.round(field.confidence * 100)}%
                  </span>
                  <Badge variant="outline" className="text-xs min-h-10 flex items-center">
                    {field.signalCount} signals
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
