import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { subHours } from "@/lib/utils/dates";

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

  const trendingPosts = await prisma.redditTrendingPost.findMany({
    where: {
      workspaceId,
      scrapedAt: { gte: subHours(new Date(), 24) },
    },
    orderBy: [{ relevanceScore: "desc" }, { upvotes: "desc" }],
    take: 20,
  });

  return NextResponse.json({
    data: trendingPosts.map((p) => ({
      id: p.id,
      subreddit: p.subreddit,
      title: p.title,
      url: p.url,
      author: p.author,
      upvotes: p.upvotes,
      commentCount: p.commentCount,
      relevanceScore: p.relevanceScore,
      relevanceReason: p.relevanceReason,
      brandReasonTags: p.brandReasonTags ?? [],
      isActionable: p.isActionable,
      topicTags: p.topicTags ?? [],
      suggestedAction: p.suggestedAction,
    })),
  });
}
