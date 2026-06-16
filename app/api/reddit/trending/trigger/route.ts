import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { updateVelocityForPosts } from "@/lib/reddit/velocity-tracker";
import { analyzeAndStoreClusters } from "@/lib/reddit/cluster-analyzer";
import { logger } from "@/lib/logger";

const MAX_POSTS_PER_SCRAPE = 50;

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/trending/trigger" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const configs = await prisma.redditSubredditConfig.findMany({
      where: { workspaceId, isActive: true },
    });

    if (configs.length === 0) {
      return NextResponse.json({
        error: "No active subreddit configs",
        message: "Add subreddits to track before triggering a scrape",
      }, { status: 400 });
    }

    // Create a database-backed job record
    const job = await prisma.redditScrapeJob.create({
      data: {
        workspaceId,
        status: "running",
        progress: 0,
        currentSub: null,
      },
    });

    const jobId = job.id;

    const runScrape = async () => {
      let totalPosts = 0;
      let totalAnalyzed = 0;
      let totalSkipped = 0;
      const jobErrors: string[] = [];
      const allRefreshedPostIds: string[] = [];

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        try {
          await prisma.redditScrapeJob.update({
            where: { id: jobId },
            data: {
              currentSub: config.subreddit,
              progress: Math.round((i / configs.length) * 100),
            },
          });

          const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
          const cappedPosts = posts.slice(0, MAX_POSTS_PER_SCRAPE);

          if (cappedPosts.length > 0) {
            const onProgress = (
              phase: "scraping" | "analyzing" | "done",
              counts: { total: number; analyzed: number; skipped: number },
            ) => {
              // Update progress in DB during analysis phase
              if (phase === "analyzing" || phase === "done") {
                const subProgress = (i + (phase === "done" ? 1 : 0.5)) / configs.length;
                prisma.redditScrapeJob.update({
                  where: { id: jobId },
                  data: {
                    progress: Math.round(subProgress * 100),
                    result: {
                      postsFound: totalPosts + counts.total,
                      analyzed: totalAnalyzed + counts.analyzed,
                      skipped: totalSkipped + counts.skipped,
                    },
                  },
                }).catch(() => {}); // Fire-and-forget progress update
              }
            };

            const result = await processAndStoreTrendingPosts(workspaceId, cappedPosts, onProgress);
            totalPosts += cappedPosts.length;
            if (result.refreshedPostIds && result.refreshedPostIds.length > 0) {
              allRefreshedPostIds.push(...result.refreshedPostIds);
            }
          }
        } catch (err) {
          const errorMsg = `r/${config.subreddit}: ${String(err)}`;
          jobErrors.push(errorMsg);
          logger.error("reddit.trigger.subreddit_error", {
            subreddit: config.subreddit,
            error: String(err),
          });
        }

        await prisma.redditScrapeJob.update({
          where: { id: jobId },
          data: {
            progress: Math.round(((i + 1) / configs.length) * 100),
            result: {
              postsFound: totalPosts,
              analyzed: totalAnalyzed,
              skipped: totalSkipped,
              completedSubreddits: i + 1,
              totalSubreddits: configs.length,
            },
          },
        });
      }

      // Phase 4: Run velocity tracking on refreshed posts
      if (allRefreshedPostIds.length > 0) {
        try {
          await updateVelocityForPosts(workspaceId, allRefreshedPostIds);
          logger.info("reddit.trigger.velocity_completed", {
            jobId,
            refreshedCount: allRefreshedPostIds.length,
          });
        } catch (err) {
          logger.error("reddit.trigger.velocity_error", { jobId, error: String(err) });
        }
      }

      // Phase 4: Run cross-subreddit clustering
      try {
        await analyzeAndStoreClusters(workspaceId);
        logger.info("reddit.trigger.clustering_completed", { jobId });
      } catch (err) {
        logger.error("reddit.trigger.clustering_error", { jobId, error: String(err) });
      }

      await prisma.redditScrapeJob.update({
        where: { id: jobId },
        data: {
          status: jobErrors.length > 0 ? "completed_with_errors" : "completed",
          progress: 100,
          currentSub: null,
          completedAt: new Date(),
          result: {
            postsFound: totalPosts,
            analyzed: totalAnalyzed,
            skipped: totalSkipped,
            errors: jobErrors,
            velocityUpdated: allRefreshedPostIds.length,
          },
        },
      });

      log.info("api.request.success", { jobId, configCount: configs.length, totalPosts });
    };

    void runScrape();

    return NextResponse.json({
      data: {
        jobId,
        message: `Scrape triggered across ${configs.length} subreddits. Poll /api/reddit/trending/status?jobId=${jobId} for progress.`,
      },
    });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/reddit/trending/trigger",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
