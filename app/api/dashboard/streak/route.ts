import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateStreak, calculateConsistencyScore } from "@/lib/dashboard/streak-utils";

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

  const publishedPosts = await prisma.post.findMany({
    where: { workspaceId, status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });

  const dates = publishedPosts.map((p) => p.publishedAt!).filter(Boolean);
  const { currentStreak, longestStreak, lastPostDate } = calculateStreak(dates);
  const consistencyScore = calculateConsistencyScore(publishedPosts);

  return NextResponse.json({
    data: {
      currentStreak,
      longestStreak,
      consistencyScore,
      lastPostDate: lastPostDate?.toISOString() ?? null,
    },
  });
}
