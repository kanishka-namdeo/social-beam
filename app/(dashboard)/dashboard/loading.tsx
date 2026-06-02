import { Skeleton } from "@/components/ui/skeleton";

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

      {/* Widget grid skeleton — 4 column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Stats — full width */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4">
          <div className="rounded-sm border border-border bg-card p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="size-5" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Calendar Preview */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>

        {/* Trending Radar */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>

        {/* Engagement Sparkline */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>

        {/* Posting Streak */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>

        {/* Profile Analysis — full width */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Connected Accounts — full width */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-sm" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
