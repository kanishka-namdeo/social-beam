import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { scrapeSubreddit } from "@/lib/reddit/scraper";
import { processAndStoreTrendingPosts } from "@/lib/reddit/trending-analysis";
import { logger } from "@/lib/logger";

export interface JobStatus {
  phase: "scraping" | "analyzing" | "done" | "error";
  progress: number;
  postsFound: number;
  analyzed: number;
  skipped: number;
  totalSubreddits: number;
  completedSubreddits: number;
  message?: string;
}

const activeJobs = new Map<string, JobStatus>();

export function getJobStatus(jobId: string): JobStatus | undefined {
  return activeJobs.get(jobId);
}

export function clearOldJobs(): void {
  for (const [key, job] of activeJobs) {
    if (job.phase === "done" || job.phase === "error") {
      activeJobs.delete(key);
    }
  }
}

clearOldJobs();

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

    const jobId = `${workspaceId}:job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const initialStatus: JobStatus = {
      phase: "scraping",
      progress: 0,
      postsFound: 0,
      analyzed: 0,
      skipped: 0,
      totalSubreddits: configs.length,
      completedSubreddits: 0,
      message: `Starting scrape across ${configs.length} subreddits...`,
    };
    activeJobs.set(jobId, initialStatus);

    const runScrape = async () => {
      let totalPosts = 0;

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        try {
          const status = activeJobs.get(jobId);
          if (status) {
            activeJobs.set(jobId, {
              ...status,
              message: `Scraping r/${config.subreddit}...`,
            });
          }

          const posts = await scrapeSubreddit(config.subreddit, config.sortOrder);
          const cappedPosts = posts.slice(0, MAX_POSTS_PER_SCRAPE);
          if (cappedPosts.length > 0) {
            const onProgress = (
              phase: "scraping" | "analyzing" | "done",
              counts: { total: number; analyzed: number; skipped: number },
            ) => {
              const currentStatus = activeJobs.get(jobId);
              if (currentStatus) {
                activeJobs.set(jobId, {
                  ...currentStatus,
                  phase,
                  progress: Math.round(((i + (phase === "done" ? 1 : 0.5)) / configs.length) * 100),
                  postsFound: totalPosts + counts.total,
                  analyzed: currentStatus.analyzed + counts.analyzed,
                  skipped: currentStatus.skipped + counts.skipped,
                });
              }
            };

            await processAndStoreTrendingPosts(workspaceId, cappedPosts, onProgress);
            totalPosts += cappedPosts.length;
          }
        } catch (err) {
          logger.error("reddit.trigger.subreddit_error", {
            subreddit: config.subreddit,
            error: String(err),
          });
        }

        const currentStatus = activeJobs.get(jobId);
        if (currentStatus) {
          activeJobs.set(jobId, {
            ...currentStatus,
            completedSubreddits: i + 1,
            postsFound: totalPosts,
            progress: Math.round(((i + 1) / configs.length) * 100),
            message: i + 1 === configs.length ? "Done!" : `Completed r/${config.subreddit}`,
          });
        }
      }

      const finalStatus = activeJobs.get(jobId);
      if (finalStatus) {
        activeJobs.set(jobId, {
          ...finalStatus,
          phase: "done",
          progress: 100,
          message: `Scraped ${configs.length} subreddits, found ${totalPosts} posts`,
        });
      }

      log.info("api.request.success", { configCount: configs.length, totalPosts });
    };

    void runScrape();

    return NextResponse.json({
      data: {
        jobId,
        message: `Scrape triggered across ${configs.length} subreddits. Monitoring progress...`,
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
