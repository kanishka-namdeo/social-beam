import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SyncContent } from "./sync-content";

export default async function SyncPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (!workspaceId) {
    redirect("/login");
  }

  const connectedAccounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
    select: {
      platform: true,
      platformUsername: true,
      lastSyncedAt: true,
    },
    orderBy: { platform: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-0">
      <PageHeader
        title="Data Sync"
        description="Sync data from your connected social platforms. View sync status and trigger manual syncs."
      />
      <SyncContent connectedAccounts={connectedAccounts} />
    </div>
  );
}
