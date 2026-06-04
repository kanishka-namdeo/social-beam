import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { recommendSubreddits } from "@/lib/reddit/subreddit-recommender";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/subreddits/recommend" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const recommendations = await recommendSubreddits(workspaceId);

    log.info("reddit.recommendations.api.success", {
      workspaceId,
      count: recommendations.length,
    });

    return NextResponse.json({
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/subreddits/recommend",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}