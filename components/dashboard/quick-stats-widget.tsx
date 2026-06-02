"use client";

import { CheckCircle, Clock, FileText, WarningCircle } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickStatsWidgetProps {
  stats: {
    totalPosts: number;
    scheduledCount: number;
    publishedThisWeek: number;
    failedCount: number;
  };
}

export function QuickStatsWidget({ stats }: QuickStatsWidgetProps) {
  const isLoaded = stats.totalPosts !== undefined;

  if (!isLoaded) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
            <FileText className="size-4 text-brand" weight="bold" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-sm border border-border bg-card p-4">
                <Skeleton className="size-5 rounded-sm" />
                <Skeleton className="h-7 w-12 mt-2" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      icon: FileText,
      colorClass: "text-foreground",
    },
    {
      label: "Scheduled",
      value: stats.scheduledCount,
      icon: Clock,
      colorClass: "text-post-queued",
    },
    {
      label: "Published This Week",
      value: stats.publishedThisWeek,
      icon: CheckCircle,
      colorClass: "text-success",
    },
    {
      label: "Failed",
      value: stats.failedCount,
      icon: WarningCircle,
      colorClass: "text-destructive",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
          <FileText className="size-4 text-brand" weight="bold" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(({ label, value, icon: Icon, colorClass }) => (
            <div
              key={label}
              className="rounded-sm border border-border bg-card p-4"
            >
              <Icon className="size-5 text-muted-foreground" />
              <div className={`text-3xl font-mono tabular-nums font-semibold mt-2 ${colorClass}`}>
                {value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
