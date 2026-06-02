import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const scheduledPosts = await prisma.post.findMany({
    where: {
      workspaceId,
      status: "SCHEDULED",
      scheduledAt: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      PostPlatform: {
        select: {
          platform: true,
        },
      },
    },
  });

  return NextResponse.json({
    posts: scheduledPosts.map((p) => ({
      id: p.id,
      title: p.title,
      scheduledAt: p.scheduledAt,
      platforms: p.PostPlatform.map((pp) => pp.platform),
    })),
  });
}
