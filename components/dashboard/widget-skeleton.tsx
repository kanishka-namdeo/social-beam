import { Skeleton } from "@/components/ui/skeleton";
import { sizeToGrid } from "@/lib/dashboard/widget-registry";

interface WidgetSkeletonProps {
  height?: number;
  sizeToken?: string;
}

export function WidgetSkeleton({ height, sizeToken }: WidgetSkeletonProps) {
  const grid = sizeToken ? sizeToGrid(sizeToken) : null;
  const rowHeight = height || grid?.h || 3;
  const lineCount = rowHeight >= 5 ? 4 : rowHeight >= 3 ? 3 : 2;

  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: lineCount }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
