"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, WarningCircle, XCircle, Spinner, Pulse, Heartbeat } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: number; // percentage
  lastChecked: string;
}

interface SystemHealthWidgetProps {
  services: Service[];
  overallStatus: ServiceStatus;
  isLoading?: boolean;
  size?: WidgetSizeToken;
}

const statusConfig: Record<ServiceStatus, { icon: typeof CheckCircle; className: string; label: string }> = {
  operational: {
    icon: CheckCircle,
    className: "text-success",
    label: "Operational",
  },
  degraded: {
    icon: WarningCircle,
    className: "text-warning",
    label: "Degraded",
  },
  down: {
    icon: XCircle,
    className: "text-destructive",
    label: "Down",
  },
  maintenance: {
    icon: Spinner,
    className: "text-muted-foreground",
    label: "Maintenance",
  },
};

export function SystemHealthWidget({
  services,
  overallStatus,
  isLoading,
  size = "10x2",
}: SystemHealthWidgetProps) {
  const { isCompact, isTall, isNarrow } = getSizeDerivatives(size);

  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  const operationalCount = services.filter((s) => s.status === "operational").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;

  const isEmpty = services.length === 0;

  return (
    <BaseWidget
      size={size}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyState={{
        icon: <Heartbeat className="size-8" weight="light" />,
        message: "All systems nominal",
        description: "System health monitoring is active.",
      }}
      header={{
        title: "System Health",
        icon: <Pulse className="size-4 text-brand" weight="bold" />,
        action: !isEmpty ? (
          <div className="flex items-center gap-control">
            <OverallIcon className={cn("size-4", overallConfig.className)} weight="fill" />
            <Badge
              variant="outline"
              className={cn("text-micro rounded-sm", overallConfig.className)}
            >
              {overallConfig.label}
            </Badge>
          </div>
        ) : undefined,
      }}
    >
        {/* Summary */}
        {isCompact ? (
          <div className="flex items-center gap-panel">
            <div className="flex items-center gap-control">
              <CheckCircle className="size-4 text-success" weight="fill" />
              <span className="text-body font-mono tabular-nums">{operationalCount}</span>
            </div>
            {degradedCount > 0 && (
              <div className="flex items-center gap-control">
                <WarningCircle className="size-4 text-warning" weight="fill" />
                <span className="text-body font-mono tabular-nums">{degradedCount}</span>
              </div>
            )}
            {downCount > 0 && (
              <div className="flex items-center gap-control">
                <XCircle className="size-4 text-destructive" weight="fill" />
                <span className="text-body font-mono tabular-nums">{downCount}</span>
              </div>
            )}
            <span className="text-caption text-muted-foreground">services</span>
          </div>
        ) : (
          <div className={cn(
            "grid gap-control",
            isNarrow ? "grid-cols-1" : isTall ? "grid-cols-3" : "grid-cols-2"
          )}>
            {services.map((service) => {
              const cfg = statusConfig[service.status];
              const Icon = cfg.icon;

              return (
                <div
                  key={service.name}
                  className="flex items-center gap-section rounded-sm border border-subtle bg-surface-1 p-card"
                >
                  <Icon className={cn("size-5 shrink-0", cfg.className)} weight="fill" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-foreground truncate">
                        {service.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-micro rounded-sm shrink-0", cfg.className)}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1 min-w-0">
                      <span className="text-caption text-muted-foreground tabular-nums truncate">
                        Uptime: {service.uptime.toFixed(1)}%
                      </span>
                      {isTall && (
                        <span className="text-caption text-muted-foreground tabular-nums truncate ml-2">
                          Last checked: {service.lastChecked}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </BaseWidget>
  );
}
