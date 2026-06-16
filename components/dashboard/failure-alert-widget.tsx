"use client";

import Link from "next/link";
import { WarningCircle, X } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface FailureAlert {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

interface FailureAlertWidgetProps {
  alerts: FailureAlert[];
  size?: WidgetSizeToken;
}

export function FailureAlertWidget({ alerts, size = "10x2" }: FailureAlertWidgetProps) {
  const { isCompact, isWide } = getSizeDerivatives(size);

  const handleDismiss = (id: string) => {
    // TODO: Implement dismiss logic
    console.log("Dismiss alert:", id);
  };

  return (
    <BaseWidget
      size={size}
      isEmpty={alerts.length === 0}
      emptyState={{
        icon: <WarningCircle className="size-8" weight="light" />,
        message: "No failed posts",
        description: "All your posts are publishing successfully",
      }}
      className="border-alert-error-border bg-alert-error"
      header={{
        title: "Action Required",
        icon: <WarningCircle className="size-4 text-destructive" weight="bold" />,
        action: alerts.length > 0 && (
          <Badge variant="destructive" className="text-micro rounded-sm">
            {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
          </Badge>
        ),
      }}
    >
      <div className={cn("grid gap-control", isCompact ? "grid-cols-1" : "grid-cols-2")}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-control rounded-sm border border-destructive/20 bg-background",
              isCompact ? "py-1.5 px-card" : "p-card"
            )}
          >
            <WarningCircle className="size-4 text-destructive shrink-0 mt-1" weight="fill" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-foreground truncate">{alert.title}</p>
              {!isCompact && (
                <p className="text-caption text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
              )}
              {!isCompact && alert.action && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-control h-auto py-1 text-xs"
                  asChild
                >
                  <Link href={alert.action.href}>{alert.action.label}</Link>
                </Button>
              )}
            </div>
            {!isCompact && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDismiss(alert.id)}
                className="h-6 w-6 shrink-0"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </BaseWidget>
  );
}
