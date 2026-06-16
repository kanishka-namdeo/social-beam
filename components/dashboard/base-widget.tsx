import { Card, CardContent } from "@/components/ui/card";
import { WidgetHeader } from "@/components/dashboard/widget-header";
import { WidgetLoadingState } from "@/components/dashboard/widget-loading-state";
import { WidgetEmptyState } from "@/components/dashboard/widget-empty-state";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { WidgetSizeToken, WidgetHeaderConfig, EmptyStateConfig } from "@/lib/dashboard/widget-types";

interface BaseWidgetProps {
  /** Widget size token */
  size?: WidgetSizeToken;
  /** Header configuration */
  header: WidgetHeaderConfig;
  /** Whether the widget is loading */
  isLoading?: boolean;
  /** Whether the widget has no data to display */
  isEmpty?: boolean;
  /** Empty state configuration (shown when isEmpty is true) */
  emptyState?: EmptyStateConfig;
  /** Widget content */
  children: ReactNode;
  /** Additional className for the Card wrapper */
  className?: string;
  /** Content area className */
  contentClassName?: string;
  /** Whether content area should scroll (default: true, uses overflow-y-auto). Set to false for overflow-hidden. */
  scrollable?: boolean;
}

/**
 * Base widget component providing consistent Card structure
 * All widgets should use this as their wrapper
 */
export function BaseWidget({
  size,
  header,
  isLoading = false,
  isEmpty = false,
  emptyState,
  children,
  className,
  contentClassName,
  scrollable = true,
}: BaseWidgetProps) {
  return (
    <Card
      className={cn(
        "h-full flex flex-col rounded-sm border border-border/60 bg-card",
        className
      )}
    >
      <WidgetHeader {...header} />
      <CardContent className={cn(
        "flex-1 min-h-0",
        scrollable ? "overflow-y-auto" : "overflow-hidden",
        contentClassName
      )}>
        {isLoading ? (
          <WidgetLoadingState size={size} />
        ) : isEmpty && emptyState ? (
          <WidgetEmptyState {...emptyState} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
