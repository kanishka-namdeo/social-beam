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

  const fourteenDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  })();

  const engagementSnapshots = await prisma.analyticsSnapshot.findMany({
    where: {
      Post: {
        workspaceId,
        publishedAt: { gte: fourteenDaysAgo },
      },
    },
    orderBy: { snapshotAt: "asc" },
    select: {
      snapshotAt: true,
      engagementRate: true,
    },
    take: 1000,
  });

  return NextResponse.json({
    data: engagementSnapshots.map((s) => ({
      date: s.snapshotAt.toISOString(),
      engagementRate: s.engagementRate ?? 0,
    })),
  });
}
