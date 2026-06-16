import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface EngagementDepthResult {
  postId: string;
  engagementDepthScore: number;
  metrics: {
    numComments: number;
    avgCommentLength: number;
    replyChainDepth: number;
    commentVelocity: number;
  };
}

export async function calculateEngagementDepth(
  postId: string,
  postCreatedAt: Date
): Promise<EngagementDepthResult> {
  logger.debug("reddit.engagement_analyzer.start", { postId });

  const comments = await prisma.redditComment.findMany({
    where: { postId },
    select: {
      body: true,
      depth: true,
      createdAt: true,
    },
  });

  if (comments.length === 0) {
    return {
      postId,
      engagementDepthScore: 0,
      metrics: {
        numComments: 0,
        avgCommentLength: 0,
        replyChainDepth: 0,
        commentVelocity: 0,
      },
    };
  }

  const numComments = comments.length;
  const avgCommentLength =
    comments.reduce((sum: number, c: { body: string }) => sum + c.body.length, 0) / numComments;
  const replyChainDepth = Math.max(...comments.map((c: { depth: number }) => c.depth));

  const twoHoursAfterPost = new Date(postCreatedAt.getTime() + 2 * 60 * 60 * 1000);
  const commentsInFirst2Hours = comments.filter(
    (c: { createdAt: Date }) => c.createdAt <= twoHoursAfterPost
  ).length;
  const commentVelocity = commentsInFirst2Hours;

  const engagementDepthScore =
    numComments * 0.3 +
    Math.min(avgCommentLength / 100, 10) * 0.2 +
    replyChainDepth * 0.3 +
    Math.min(commentVelocity / 10, 10) * 0.2;

  const normalizedScore = Math.min(engagementDepthScore, 100);

  logger.info("reddit.engagement_analyzer.complete", {
    postId,
    engagementDepthScore: normalizedScore,
    numComments,
    avgCommentLength: Math.round(avgCommentLength),
    replyChainDepth,
    commentVelocity,
  });

  return {
    postId,
    engagementDepthScore: normalizedScore,
    metrics: {
      numComments,
      avgCommentLength: Math.round(avgCommentLength),
      replyChainDepth,
      commentVelocity,
    },
  };
}

export async function calculateEngagementDepthForPosts(
  postIds: string[]
): Promise<Map<string, EngagementDepthResult>> {
  const results = new Map<string, EngagementDepthResult>();

  const posts = await prisma.redditTrendingPost.findMany({
    where: { id: { in: postIds } },
    select: { id: true, scrapedAt: true },
  });

  for (const post of posts) {
    const result = await calculateEngagementDepth(post.id, post.scrapedAt);
    results.set(post.id, result);
  }

  return results;
}
