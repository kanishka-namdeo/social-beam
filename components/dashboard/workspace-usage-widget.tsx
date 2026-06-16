"use client";

import { Progress } from "@/components/ui/progress";
import { Users, HardDrives, FileText, Image as ImageIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface WorkspaceUsageWidgetProps {
  usage: {
    teamMembers: { used: number; limit: number };
    storage: { used: number; limit: number }; // in MB
    posts: { used: number; limit: number };
    media: { used: number; limit: number }; // in MB
  };
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${mb}MB`;
}

export function WorkspaceUsageWidget({
  usage,
  isLoading,
  size = "5x2",
}: WorkspaceUsageWidgetProps) {
  const { isWide, isCompact, rows } = getSizeDerivatives(size);
  const isCompactLayout = rows <= 2 && !isWide;

  const allMetrics = [
    {
      label: "Team Members",
      icon: Users,
      used: usage.teamMembers.used,
      limit: usage.teamMembers.limit,
      display: `${usage.teamMembers.used}/${usage.teamMembers.limit}`,
      percent: (usage.teamMembers.used / usage.teamMembers.limit) * 100,
    },
    {
      label: "Storage",
      icon: HardDrives,
      used: usage.storage.used,
      limit: usage.storage.limit,
      display: `${formatStorage(usage.storage.used)}/${formatStorage(usage.storage.limit)}`,
      percent: (usage.storage.used / usage.storage.limit) * 100,
    },
    {
      label: "Posts",
      icon: FileText,
      used: usage.posts.used,
      limit: usage.posts.limit,
      display: `${usage.posts.used}/${usage.posts.limit}`,
      percent: (usage.posts.used / usage.posts.limit) * 100,
    },
    {
      label: "Media",
      icon: ImageIcon,
      used: usage.media.used,
      limit: usage.media.limit,
      display: `${formatStorage(usage.media.used)}/${formatStorage(usage.media.limit)}`,
      percent: (usage.media.used / usage.media.limit) * 100,
    },
  ];

  const metrics = isCompactLayout ? allMetrics.slice(0, 2) : allMetrics;

  const isEmpty = usage.teamMembers.used === 0 && usage.storage.used === 0 && usage.posts.used === 0 && usage.media.used === 0;

  return (
    <BaseWidget
      size={size}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyState={{
        icon: <HardDrives className="size-8" weight="light" />,
        message: "No usage data",
        description: "Usage metrics will appear as you use the platform.",
      }}
      header={{
        title: "Workspace Usage",
        icon: <HardDrives className="size-4 text-brand" weight="bold" />,
      }}
    >
        <div className={cn(
          "grid gap-panel",
          isWide ? "grid-cols-2" : "grid-cols-1"
        )}>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isWarning = metric.percent > 80;
            const isDanger = metric.percent > 95;

            return (
              <div
                key={metric.label}
                className="flex items-center gap-section rounded-sm border border-subtle bg-surface-1 p-card"
              >
                <div className={cn("rounded-sm bg-surface-2 flex items-center justify-center shrink-0", isCompactLayout ? "size-5" : "size-8")}>
                  <Icon className={cn("text-muted-foreground", isCompactLayout ? "size-3" : "size-4")} weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-caption text-muted-foreground truncate min-w-0">{metric.label}</span>
                    <span className={cn(
                      "text-caption font-mono tabular-nums shrink-0 ml-control",
                      isDanger ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"
                    )}>
                      {metric.display}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Progress
                      value={metric.percent}
                      className="h-1.5"
                      indicatorColor={isDanger ? "var(--destructive)" : isWarning ? "var(--warning)" : "var(--chart-1)"}
                    />
                  </div>
                  {!isCompact && (
                    <span className="text-caption text-muted-foreground mt-1 tabular-nums">
                      {metric.percent.toFixed(0)}% used
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
    </BaseWidget>
  );
}
