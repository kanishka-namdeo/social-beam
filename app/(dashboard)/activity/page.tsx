import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ActivityClient } from "@/components/activity/activity-client";
import type { ActivityLog } from "@/lib/activity-utils";

export default async function ActivityPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  const initialLogs = await prisma.activityLog.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground">
          View all activity logs from background tasks, scraping, analytics, and more.
        </p>
      </div>
      <ActivityClient
        initialLogs={initialLogs.map((log) => ({
          id: log.id,
          type: log.type as ActivityLog["type"],
          status: log.status as ActivityLog["status"],
          details: log.details as Record<string, unknown> | null,
          startedAt: log.startedAt.toISOString(),
          finishedAt: log.finishedAt?.toISOString() ?? null,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
