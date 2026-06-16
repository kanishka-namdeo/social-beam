import { Skeleton } from "@/components/ui/skeleton";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>

      {/* Widget grid skeleton — 10-col grid */}
      <div className="grid grid-cols-10 gap-4">
        {/* Quick Stats — 10x1 */}
        <div className="col-span-10">
          <WidgetSkeleton sizeToken="10x1" />
        </div>

        {/* Recent Posts — 5x3 */}
        <div className="col-span-10 md:col-span-5">
          <WidgetSkeleton sizeToken="5x3" />
        </div>

        {/* Insights — 5x3 */}
        <div className="col-span-10 md:col-span-5">
          <WidgetSkeleton sizeToken="5x3" />
        </div>

        {/* Calendar Preview — 5x3 */}
        <div className="col-span-10 md:col-span-5">
          <WidgetSkeleton sizeToken="5x3" />
        </div>

        {/* Trending Radar — 5x3 */}
        <div className="col-span-10 md:col-span-5">
          <WidgetSkeleton sizeToken="5x3" />
        </div>

        {/* Engagement Sparkline — 5x3 */}
        <div className="col-span-10 md:col-span-5">
          <WidgetSkeleton sizeToken="5x3" />
        </div>

        {/* Posting Streak — 2x2 */}
        <div className="col-span-10 md:col-span-2">
          <WidgetSkeleton sizeToken="2x2" />
        </div>

        {/* Connected Accounts — 10x1 */}
        <div className="col-span-10">
          <WidgetSkeleton sizeToken="10x1" />
        </div>
      </div>
    </div>
  );
}
