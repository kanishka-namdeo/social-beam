import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RedditPost } from "./types";
import { TrendAnalysisSchema } from "./types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.2,
});

const systemPrompt = `You are SocialBeam's Reddit trend analyzer. Your job is to evaluate whether a trending Reddit post is relevant and actionable for a social media manager.

Consider:
1. Is the topic relevant to social media marketing, content creation, brand building, or digital marketing?
2. Does the post present an opportunity (e.g., trending discussion, viral question, content gap)?
3. What action should the user take? (Comment, create related content, share to their audience, monitor)

Be conservative — only mark posts as relevant if they clearly relate to the user's domain.
Score 0.0-1.0 based on relevance, engagement potential, and timeliness.`;

export interface AnalysisResult {
  relevanceScore: number;
  isRelevant: boolean;
  reason: string;
  topicTags: string[];
  suggestedAction: string;
}

async function analyzePost(post: RedditPost, brandProfile?: { bio?: string; tone?: string; audience?: Record<string, unknown> }): Promise<AnalysisResult> {
  const structuredModel = model.withStructuredOutput(TrendAnalysisSchema, {
    name: "trend_analysis",
    includeRaw: false,
  });

  const brandContext = brandProfile
    ? `User's brand context:\n- Bio: ${brandProfile.bio ?? "N/A"}\n- Tone: ${brandProfile.tone ?? "N/A"}\n- Audience: ${brandProfile.audience ? JSON.stringify(brandProfile.audience) : "N/A"}`
    : "No brand profile available — evaluate based on general social media marketing relevance.";

  const userPrompt = `Analyze this Reddit post:

Title: ${post.title}
Subreddit: r/${post.subreddit}
Upvotes: ${post.upvotes}
Comments: ${post.commentCount}
Author: ${post.author}
URL: ${post.url}

${brandContext}

Return a structured analysis with relevance score (0-1), whether it's relevant, a reason, topic tags, and a suggested action.`;

  try {
    const response = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]) as AnalysisResult;

    logger.debug("reddit.analysis.complete", { title: post.title, relevanceScore: response.relevanceScore });
    return response;
  } catch (err) {
    logger.error("reddit.analysis.error", { title: post.title, error: String(err) });
    return {
      relevanceScore: 0,
      isRelevant: false,
      reason: "Analysis failed",
      topicTags: [],
      suggestedAction: "Review manually",
    };
  }
}

export async function processAndStoreTrendingPosts(workspaceId: string, posts: RedditPost[]): Promise<void> {
  if (posts.length === 0) return;

  const userProfile = await prisma.userProfile.findUnique({ where: { workspaceId } });
  const brandProfile = userProfile ? {
    bio: (userProfile.bio as Record<string, unknown>)?.name as string ?? undefined,
    tone: userProfile.tone ?? undefined,
    audience: (userProfile.audience as Record<string, unknown>) ?? undefined,
  } : undefined;

  const analyzedPosts = await Promise.all(
    posts.map(async (post) => {
      const analysis = await analyzePost(post, brandProfile);
      return { ...post, analysis };
    })
  );

  const records = analyzedPosts.map((p) => ({
    workspaceId,
    subreddit: p.subreddit,
    title: p.title,
    url: p.url,
    author: p.author,
    upvotes: p.upvotes,
    commentCount: p.commentCount,
    relevanceScore: p.analysis.relevanceScore,
    relevanceReason: p.analysis.reason,
    isActionable: p.analysis.isRelevant && p.analysis.relevanceScore >= 0.5,
    topicTags: p.analysis.topicTags,
    suggestedAction: p.analysis.suggestedAction,
  }));

  await prisma.redditTrendingPost.createMany({ data: records });

  logger.info("reddit.trending.stored", { workspaceId, postCount: records.length, actionableCount: records.filter((r) => r.isActionable).length });
}
