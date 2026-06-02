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

  // Find the best performing post this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const topPostAnalytics = await prisma.analyticsSnapshot.findMany({
    where: {
      Post: {
        workspaceId,
        publishedAt: {
          gte: oneWeekAgo,
        },
      },
    },
    orderBy: { engagementRate: "desc" },
    take: 1,
    include: {
      Post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Get draft posts pending review
  const pendingReviews = await prisma.post.findMany({
    where: {
      workspaceId,
      status: "DRAFT",
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      createdAt: true,
      PostPlatform: {
        select: {
          platform: true,
        },
      },
    },
  });

  let topPost = null;
  if (topPostAnalytics.length > 0 && topPostAnalytics[0]) {
    const snap = topPostAnalytics[0];
    topPost = {
      id: snap.Post.id,
      title: snap.Post.title ?? "Untitled",
      platform: snap.platform,
      engagementRate: snap.engagementRate ?? 0,
      likes: snap.likes,
      comments: snap.comments,
      shares: snap.shares,
    };
  }

  return NextResponse.json({
    topPost,
    pendingReviews: pendingReviews.map((p) => ({
      id: p.id,
      title: p.title ?? "Untitled",
      platforms: p.PostPlatform.map((pp) => pp.platform),
      createdAt: p.createdAt,
    })),
  });
}
