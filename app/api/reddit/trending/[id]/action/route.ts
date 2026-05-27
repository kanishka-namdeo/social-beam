import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/trending/[id]/action" });

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

    const body = await req.json();
    const { action } = body as { action?: string };

    if (!action || !["dismiss", "undo-dismiss", "mark-acted", "unmark-acted"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be: dismiss, undo-dismiss, mark-acted, or unmark-acted" }, { status: 400 });
    }

    const post = await prisma.redditTrendingPost.findUnique({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const now = new Date();
    let updatedPost;

    switch (action) {
      case "dismiss":
        updatedPost = await prisma.redditTrendingPost.update({
          where: { id: postId },
          data: { dismissedAt: now },
        });
        break;
      case "undo-dismiss":
        updatedPost = await prisma.redditTrendingPost.update({
          where: { id: postId },
          data: { dismissedAt: null },
        });
        break;
      case "mark-acted":
        updatedPost = await prisma.redditTrendingPost.update({
          where: { id: postId },
          data: { actedOnAt: now },
        });
        break;
      case "unmark-acted":
        updatedPost = await prisma.redditTrendingPost.update({
          where: { id: postId },
          data: { actedOnAt: null },
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    log.info("api.request.success", { postId, action });
    return NextResponse.json({ data: updatedPost });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/trending/[id]/action",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
