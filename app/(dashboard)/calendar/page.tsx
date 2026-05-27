import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function CalendarPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [posts, connectedAccounts] = await Promise.all([
    prisma.post.findMany({
      where: {
        workspaceId: user.workspaceId,
        scheduledAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        confidence: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
        platforms: {
          select: {
            platform: true,
            status: true,
            mediaUrls: true,
          },
        },
      },
    }),
    prisma.connectedAccount.findMany({
      where: { workspaceId: user.workspaceId, status: "connected" },
      select: { platform: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Schedule, preview, and manage your posts across all platforms.
        </p>
      </div>
      <CalendarClient
        initialPosts={posts.map((p) => {
          const content = (p.content as { text?: string; media?: Array<{ type: string; url: string }> }) ?? {};
          return {
            id: p.id,
            title: p.title,
            content: content.text ?? null,
            status: p.status,
            confidence: p.confidence,
            scheduledAt: p.scheduledAt?.toISOString() ?? null,
            publishedAt: p.publishedAt?.toISOString() ?? null,
            platforms: p.platforms.map((pl) => ({
              platform: pl.platform,
              status: pl.status,
            })),
            media: content.media ?? [],
          };
        })}
        initialDate={now.toISOString()}
        connectedPlatforms={connectedAccounts.map((a) => a.platform)}
      />
    </div>
  );
}
