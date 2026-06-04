import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/onboarding";
import { redirect } from "next/navigation";
import { InboxClient } from "@/components/inbox/inbox-client";

export default async function InboxPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const [initialItems, connectedAccounts, unreadCount] = await Promise.all([
    prisma.engagementItem.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.connectedAccount.findMany({
      where: { workspaceId: user.workspaceId, status: "connected" },
      select: { platform: true },
    }),
    prisma.engagementItem.count({
      where: { workspaceId: user.workspaceId, status: "UNREAD" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="stagger-1 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Manage comments, mentions, and messages across all your social platforms.
        </p>
      </div>
      <div className="stagger-2">
        <InboxClient
          initialItems={initialItems.map((item) => ({
            id: item.id,
            platform: item.platform,
            type: item.type,
            authorName: item.authorName,
            authorAvatar: item.authorAvatar,
            content: item.content,
            parentContent: item.parentContent,
            platformUrl: item.platformUrl,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
            sentiment: item.sentiment,
            aiDraft: item.aiDraft,
          }))}
          connectedPlatforms={connectedAccounts.map((a) => a.platform)}
          initialUnreadCount={unreadCount}
        />
      </div>
    </div>
  );
}
