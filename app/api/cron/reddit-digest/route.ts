import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendRedditDigest } from "@/lib/email/flows/send-reddit-digest";
import { acquireCronLock } from "@/lib/cron-lock";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lock = await acquireCronLock("cron:reddit-digest");
  if (!lock) {
    logger.info("api.cron.reddit_digest.already_running");
    return NextResponse.json({ message: "Already in progress" });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const workspacesWithAlerts = await prisma.workspace.findMany({
      where: {
        RedditAlert: {
          some: { enabled: true },
        },
      },
      select: {
        id: true,
        User: {
          select: { email: true, name: true },
        },
      },
    });

    if (workspacesWithAlerts.length === 0) {
      return NextResponse.json({ success: true, workspacesProcessed: 0 });
    }

    let workspacesProcessed = 0;

    for (const workspace of workspacesWithAlerts) {
      try {
        if (!workspace.User?.email) {
          logger.warn("api.cron.reddit_digest.no_user_email", {
            workspaceId: workspace.id,
          });
          continue;
        }

        const trends = await prisma.redditTrendingPost.findMany({
          where: {
            workspaceId: workspace.id,
            scrapedAt: { gte: twentyFourHoursAgo },
            relevanceScore: { gte: 0.5 },
          },
          orderBy: [{ relevanceScore: "desc" }, { upvotes: "desc" }],
          take: 10,
          select: {
            title: true,
            subreddit: true,
            upvotes: true,
            relevanceScore: true,
            intentScore: true,
            url: true,
          },
        });

        const highIntentCount = trends.filter(
          (t) => t.intentScore !== null && t.intentScore >= 70
        ).length;

        await sendRedditDigest({
          email: workspace.User.email,
          name: workspace.User.name ?? "there",
          trends: trends.map((t) => ({
            title: t.title,
            subreddit: t.subreddit,
            upvotes: t.upvotes,
            relevanceScore: t.relevanceScore,
            intentScore: t.intentScore,
            url: t.url,
          })),
          highIntentCount,
        });

        workspacesProcessed++;

        logger.debug("api.cron.reddit_digest.sent", {
          workspaceId: workspace.id,
          trendCount: trends.length,
          highIntentCount,
        });
      } catch (error) {
        logger.error("api.cron.reddit_digest.workspace_error", {
          workspaceId: workspace.id,
          error: String(error),
        });
      }
    }

    logger.info("api.cron.reddit_digest.complete", {
      workspacesProcessed,
      totalWorkspaces: workspacesWithAlerts.length,
    });

    return NextResponse.json({
      success: true,
      workspacesProcessed,
    });
  } catch (error) {
    logger.error("api.cron.reddit_digest.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await lock.release();
  }
}
