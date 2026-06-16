"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendUp, ArrowRight, Sparkle } from "@phosphor-icons/react/ssr";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import { usePremium } from "@/hooks/use-premium";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface InsightsCardProps {
  topPost?: {
    title: string;
    platform: string;
    engagementRate: number;
    likes: number;
    comments: number;
    shares: number;
  };
  trend?: {
    direction: "up" | "down";
    metric: string;
    value: string;
    period: string;
  };
  recommendation?: string;
  loading?: boolean;
  size?: WidgetSizeToken;
}

export function InsightsCard({ topPost, trend, recommendation, loading, size = "5x3" }: InsightsCardProps) {
  const { isWide, isCompact } = getSizeDerivatives(size);
  const { isPremium } = usePremium();
  
  const isEmpty = !topPost && !trend && !recommendation;

  return (
    <BaseWidget
      size={size}
      isLoading={loading}
      isEmpty={isEmpty}
      emptyState={{
        icon: <Sparkle className="size-8" weight="light" />,
        message: "No insights yet",
        description: "Connect accounts and start posting to unlock insights.",
      }}
      header={{
        title: "Insights",
        icon: <Sparkle className="size-4" weight="bold" />,
        description: !isCompact ? "What's working and what to do next" : undefined,
      }}
      className="border-ai-surface bg-ai-surface/50 border-l-2 border-l-brand"
      contentClassName="space-y-section"
    >
      {topPost && (
        <div className={cn("space-y-control", isWide && "rounded-sm border border-subtle bg-surface-1 p-card")}>
          <p className="text-caption font-medium text-muted-foreground">
            Top Performer
          </p>
          <p className="text-body text-foreground line-clamp-3">
            &ldquo;{topPost.title}&rdquo; on {topPost.platform} is your best post this week
          </p>
          <div className="flex flex-wrap gap-control min-w-0">
            <Badge variant="outline" className="text-micro gap-1 rounded-sm shrink-0">
              <TrendUp className="size-3 text-success" weight="bold" />
              {(topPost.engagementRate * 100).toFixed(1)}% engagement
            </Badge>
            {!isCompact && (
              <span className="text-body tabular-nums text-muted-foreground truncate min-w-0">
                {topPost.likes} likes &middot; {topPost.comments} comments &middot; {topPost.shares} shares
              </span>
            )}
          </div>
        </div>
      )}

      {trend && (
        <>
          <Separator />
          <div className="space-y-tight">
            <p className="text-caption font-medium text-muted-foreground">
              Trend
            </p>
            <div className="flex items-center gap-control min-w-0">
              <TrendUp
                className={`size-4 shrink-0 ${trend.direction === "up" ? "text-success" : "text-destructive"}`}
                weight="bold"
              />
              <span className="text-body text-foreground truncate min-w-0">
                {trend.metric} is <span className="font-medium">{trend.value}</span> {trend.period}
              </span>
            </div>
          </div>
        </>
      )}

      {!isCompact && isPremium && recommendation && (
        <>
          <Separator />
          <div className={cn("space-y-control", isWide && "rounded-sm border border-subtle bg-surface-1 p-card")}>
            <p className="text-caption font-medium text-muted-foreground">
              Recommendation
            </p>
            <p className="text-body text-muted-foreground line-clamp-3">{recommendation}</p>
          </div>
        </>
      )}

      {!isCompact && !isPremium && (
        <>
          <Separator />
          <FeatureGate
            isPremium={false}
            featureName="AI Recommendations"
            description="Get AI-powered recommendations to boost your content performance"
            variant="inline"
          />
        </>
      )}

      {!isCompact && (
        <div className={cn("flex flex-wrap gap-control pt-2", isWide && "col-span-2")}>
          <Button variant="default" size="sm" asChild>
            <Link href="/dashboard/compose?mode=generate-similar">
              Generate Similar Content
              <ArrowRight className="ml-1 size-4" weight="bold" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/analytics">
              View Analytics
            </Link>
          </Button>
        </div>
      )}
    </BaseWidget>
  );
}
