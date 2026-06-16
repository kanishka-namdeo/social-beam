import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface IntentSignal {
  type: string;
  text: string;
  location: "post" | "comment";
}

export interface IntentScoreResult {
  postId: string;
  intentScore: number;
  intentType: "problem_aware" | "solution_seeking" | "ready_to_buy" | null;
  intentSignals: IntentSignal[];
}

const INTENT_PATTERNS = {
  problem_aware: [
    { pattern: /frustrated with/i, weight: 15 },
    { pattern: /struggling with/i, weight: 15 },
    { pattern: /having trouble/i, weight: 12 },
    { pattern: /issue with/i, weight: 10 },
    { pattern: /problem with/i, weight: 10 },
    { pattern: /annoying/i, weight: 8 },
    { pattern: /hate when/i, weight: 12 },
    { pattern: /wish there/i, weight: 10 },
  ],
  solution_seeking: [
    { pattern: /looking for/i, weight: 20 },
    { pattern: /need a/i, weight: 18 },
    { pattern: /recommend/i, weight: 18 },
    { pattern: /suggestions? for/i, weight: 15 },
    { pattern: /how do you/i, weight: 12 },
    { pattern: /what.*use for/i, weight: 15 },
    { pattern: /best.*for/i, weight: 12 },
    { pattern: /alternative to/i, weight: 20 },
    { pattern: /vs\.?/i, weight: 10 },
  ],
  ready_to_buy: [
    { pattern: /ready to (buy|purchase|switch)/i, weight: 30 },
    { pattern: /where (can|do) i (buy|get|purchase)/i, weight: 25 },
    { pattern: /pricing/i, weight: 15 },
    { pattern: /cost/i, weight: 12 },
    { pattern: /budget/i, weight: 10 },
    { pattern: /affordable/i, weight: 12 },
    { pattern: /worth it/i, weight: 15 },
  ],
};

export async function calculateIntentScore(postId: string): Promise<IntentScoreResult> {
  logger.debug("reddit.intent_scorer.start", { postId });

  const post = await prisma.redditTrendingPost.findUnique({
    where: { id: postId },
    select: { title: true },
  });

  if (!post) {
    return {
      postId,
      intentScore: 0,
      intentType: null,
      intentSignals: [],
    };
  }

  const comments = await prisma.redditComment.findMany({
    where: { postId },
    select: { body: true },
  });

  const signals: IntentSignal[] = [];
  let totalScore = 0;

  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const { pattern, weight } of patterns) {
      if (pattern.test(post.title)) {
        signals.push({
          type: intentType,
          text: post.title,
          location: "post",
        });
        totalScore += weight;
      }

      for (const comment of comments) {
        if (pattern.test(comment.body)) {
          signals.push({
            type: intentType,
            text: comment.body.slice(0, 100),
            location: "comment",
          });
          totalScore += weight * 0.7;
        }
      }
    }
  }

  const intentScore = Math.min(Math.round(totalScore), 100);

  let intentType: IntentScoreResult["intentType"] = null;
  if (intentScore >= 70) {
    intentType = "ready_to_buy";
  } else if (intentScore >= 40) {
    intentType = "solution_seeking";
  } else if (intentScore >= 20) {
    intentType = "problem_aware";
  }

  logger.info("reddit.intent_scorer.complete", {
    postId,
    intentScore,
    intentType,
    signalCount: signals.length,
  });

  return {
    postId,
    intentScore,
    intentType,
    intentSignals: signals.slice(0, 10),
  };
}

export async function calculateIntentScoreForPosts(
  postIds: string[]
): Promise<Map<string, IntentScoreResult>> {
  const results = new Map<string, IntentScoreResult>();

  for (const postId of postIds) {
    const result = await calculateIntentScore(postId);
    results.set(postId, result);
  }

  return results;
}
