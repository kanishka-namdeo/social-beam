import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type TrendPhase = "emerging" | "peaking" | "declining";

export interface VelocityResult {
  velocityScore: number;
  commentVelocity: number;
  growthRate: number;
  trendPhase: TrendPhase;
}

const EMERGING_THRESHOLD = 5;
const PEAKING_THRESHOLD = 1;

export async function updateVelocityForPosts(
  workspaceId: string,
  postIds: string[],
): Promise<Map<string, VelocityResult>> {
  if (postIds.length === 0) return new Map();

  const now = new Date();
  const results = new Map<string, VelocityResult>();

  const existingPosts = await prisma.redditTrendingPost.findMany({
    where: {
      id: { in: postIds },
      workspaceId,
      lastVelocityCheck: { not: null },
    },
    select: {
      id: true,
      upvotes: true,
      commentCount: true,
      previousUpvotes: true,
      previousComments: true,
      lastVelocityCheck: true,
      velocityScore: true,
      trendPhase: true,
    },
  });

  const existingMap = new Map(existingPosts.map((p) => [p.id, p]));

  for (const postId of postIds) {
    const existing = existingMap.get(postId);
    if (!existing || !existing.lastVelocityCheck) continue;

    const current = await prisma.redditTrendingPost.findUnique({
      where: { id: postId },
      select: { upvotes: true, commentCount: true },
    });
    if (!current) continue;

    const hoursElapsed = Math.max(
      (now.getTime() - existing.lastVelocityCheck.getTime()) / (1000 * 60 * 60),
      0.1,
    );

    const upvoteDelta = current.upvotes - existing.upvotes;
    const commentDelta = current.commentCount - existing.commentCount;

    const velocityScore = upvoteDelta / hoursElapsed;
    const commentVelocity = commentDelta / hoursElapsed;

    const previousVelocity = existing.velocityScore ?? 0;
    const growthRate = previousVelocity !== 0
      ? ((velocityScore - previousVelocity) / Math.abs(previousVelocity)) * 100
      : velocityScore > 0 ? 100 : 0;

    const trendPhase = classifyTrendPhase(velocityScore, growthRate);

    await prisma.redditTrendingPost.update({
      where: { id: postId },
      data: {
        previousUpvotes: existing.upvotes,
        previousComments: existing.commentCount,
        lastVelocityCheck: now,
        velocityScore: Math.round(velocityScore * 100) / 100,
        trendPhase,
      },
    });

    results.set(postId, {
      velocityScore: Math.round(velocityScore * 100) / 100,
      commentVelocity: Math.round(commentVelocity * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      trendPhase,
    });
  }

  const newPostIds = postIds.filter((id) => !existingMap.has(id));
  if (newPostIds.length > 0) {
    await prisma.redditTrendingPost.updateMany({
      where: { id: { in: newPostIds } },
      data: {
        previousUpvotes: 0,
        previousComments: 0,
        lastVelocityCheck: now,
        velocityScore: 0,
        trendPhase: "emerging",
      },
    });

    for (const postId of newPostIds) {
      results.set(postId, {
        velocityScore: 0,
        commentVelocity: 0,
        growthRate: 0,
        trendPhase: "emerging",
      });
    }
  }

  logger.info("reddit.velocity.updated", {
    workspaceId,
    updatedCount: results.size,
    emergingCount: Array.from(results.values()).filter((r) => r.trendPhase === "emerging").length,
    peakingCount: Array.from(results.values()).filter((r) => r.trendPhase === "peaking").length,
    decliningCount: Array.from(results.values()).filter((r) => r.trendPhase === "declining").length,
  });

  return results;
}

function classifyTrendPhase(velocityScore: number, growthRate: number): TrendPhase {
  if (velocityScore >= EMERGING_THRESHOLD || growthRate > 50) {
    return "emerging";
  }
  if (velocityScore >= PEAKING_THRESHOLD && growthRate >= -20) {
    return "peaking";
  }
  return "declining";
}
