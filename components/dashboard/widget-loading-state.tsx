import { Skeleton } from "@/components/ui/skeleton";
import { sizeToGrid } from "@/lib/dashboard/widget-registry";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { cn } from "@/lib/utils";

interface WidgetLoadingStateProps {
  /** Size token to determine skeleton dimensions */
  size?: WidgetSizeToken;
  /** Number of content lines to show (overrides size-based calculation) */
  lines?: number;
  /** Whether to show a header skeleton */
  showHeader?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Consistent loading state for all widgets
 * Adapts skeleton layout based on widget size token
 */
export function WidgetLoadingState({
  size,
  lines,
  showHeader = true,
  className,
}: WidgetLoadingStateProps) {
  const grid = size ? sizeToGrid(size) : null;
  const rowHeight = grid?.h || 2;
  const lineCount = lines ?? (rowHeight >= 3 ? 4 : rowHeight >= 2 ? 3 : 2);
  const isCompact = rowHeight === 1;

  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && !isCompact && (
        <Skeleton className="h-5 w-28" />
      )}
      {Array.from({ length: lineCount }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 w-full"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
