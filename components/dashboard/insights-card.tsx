"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendUp, ArrowRight } from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export function InsightsCard({ topPost, trend, recommendation, loading }: InsightsCardProps) {
  return (
    <Card className="h-full rounded-sm border-ai-surface bg-ai-surface/50 border-l-2 border-l-brand">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <TrendUp className="size-4 text-brand" weight="bold" />
          Insights
        </CardTitle>
        <CardDescription>What&apos;s working and what to do next</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-28 rounded-sm" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : (
          <>
            {topPost && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Top Performer
                </p>
                <p className="text-sm text-foreground">
                  &ldquo;{topPost.title}&rdquo; on {topPost.platform} is your best post this week
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs gap-1 rounded-sm">
                    <TrendUp className="size-3 text-success" weight="bold" />
                    {(topPost.engagementRate * 100).toFixed(1)}% engagement
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {topPost.likes} likes &middot; {topPost.comments} comments &middot; {topPost.shares} shares
                  </span>
                </div>
              </div>
            )}

            {trend && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Trend
                  </p>
                  <div className="flex items-center gap-2">
                    <TrendUp
                      className={`size-4 ${trend.direction === "up" ? "text-success" : "text-destructive"}`}
                      weight="bold"
                    />
                    <span className="text-sm text-foreground">
                      {trend.metric} is <span className="font-medium">{trend.value}</span> {trend.period}
                    </span>
                  </div>
                </div>
              </>
            )}

            {recommendation && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                </div>
              </>
            )}

            {!topPost && !trend && !recommendation && (
              <p className="text-sm text-muted-foreground">
                Connect accounts and start posting to unlock insights.
              </p>
            )}

            <div className="flex gap-2 pt-2">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
