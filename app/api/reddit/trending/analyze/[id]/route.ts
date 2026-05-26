import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { analyzeSinglePost } from "@/lib/reddit/trending-analysis";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/trending/analyze/[id]" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const resolvedParams = await params;
    const postId = resolvedParams.id;

    const post = await prisma.redditTrendingPost.findUnique({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const analysis = await analyzeSinglePost(postId, workspaceId);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis failed — post not found" }, { status: 404 });
    }

    log.info("api.request.success", { postId, relevanceScore: analysis.relevanceScore });
    return NextResponse.json({ data: analysis });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/trending/analyze/[id]",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
