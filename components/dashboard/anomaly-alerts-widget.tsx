"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Warning,
  WarningCircle,
  Info,
  TrendDown,
  X,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

type AlertSeverity = "warning" | "error" | "info";

interface AnomalyAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  change: number;
  dismissed?: boolean;
}

interface AnomalyAlertsWidgetProps {
  alerts: AnomalyAlert[];
  size?: WidgetSizeToken;
}

const severityConfig: Record<AlertSeverity, { icon: typeof Warning; className: string; label: string }> = {
  warning: {
    icon: Warning,
    className: "bg-alert-warning text-warning border-alert-warning-border",
    label: "Warning",
  },
  error: {
    icon: WarningCircle,
    className: "bg-alert-error text-destructive border-alert-error-border",
    label: "Critical",
  },
  info: {
    icon: Info,
    className: "bg-brand-soft text-brand border-brand",
    label: "Info",
  },
};

export function AnomalyAlertsWidget({
  alerts,
  size = "10x2",
}: AnomalyAlertsWidgetProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { isCompact } = getSizeDerivatives(size);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const criticalCount = visibleAlerts.filter((a) => a.severity === "error").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const headerAction = (criticalCount > 0 || warningCount > 0) ? (
    <div className="flex gap-1">
      {criticalCount > 0 && (
        <Badge variant="destructive" className="text-micro rounded-sm">
          {criticalCount} critical
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge variant="outline" className="text-micro rounded-sm bg-alert-warning text-warning border-alert-warning-border">
          {warningCount} warning
        </Badge>
      )}
    </div>
  ) : undefined;

  return (
    <BaseWidget
      size={size as WidgetSizeToken}
      isEmpty={visibleAlerts.length === 0}
      emptyState={{
        icon: <Info weight="light" />,
        message: "No active alerts",
        description: "Anomalies in your engagement metrics will appear here.",
      }}
      header={{
        title: "Anomaly Alerts",
        icon: <Info weight="bold" />,
        action: headerAction,
      }}
      isLoading={false}
    >
        <div className={cn("grid gap-control", isCompact ? "grid-cols-1" : "grid-cols-2")}>
          {visibleAlerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-section rounded-sm border",
                  isCompact ? "py-1.5 px-card" : "p-card",
                  cfg.className
                )}
              >
                <Icon className="size-5 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-control">
                    <span className="text-body font-medium truncate">{alert.title}</span>
                    {!isCompact && (
                      <Badge variant="outline" className="text-xs rounded-sm shrink-0">
                        {cfg.label}
                      </Badge>
                    )}
                  </div>
                  {!isCompact && (
                    <>
                      <p className="text-caption opacity-80 mt-1 line-clamp-2">{alert.description}</p>
                      <div className="flex items-center gap-tight mt-1">
                        <TrendDown className="size-3" />
                        <span className="text-caption font-mono tabular-nums">
                          {alert.change > 0 ? "+" : ""}{alert.change.toFixed(1)}%
                        </span>
                        <span className="text-caption opacity-60">on {alert.metric}</span>
                      </div>
                    </>
                  )}
                </div>
                {!isCompact && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDismiss(alert.id)}
                    className="shrink-0"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
    </BaseWidget>
  );
}
