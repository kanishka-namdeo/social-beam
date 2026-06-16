import { ChatOpenAI } from "@langchain/openai";
import type { RedditPost } from "./types";
import { TrendAnalysisSchema } from "./types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { loadBrandContextForAI, type BrandContextForAI } from "@/lib/ai/brand-context-loader";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.2,
  maxRetries: 2,
});

const structuredModel = model.withStructuredOutput(TrendAnalysisSchema, {
  name: "analyze_reddit_post",
});

function buildSystemPrompt(brandCtx: BrandContextForAI | null): string {
  const base = `You are SocialBeam's Reddit trend analyzer. Evaluate whether a trending Reddit post is relevant and actionable for a social media manager.

Consider:
1. Relevance: Is the topic relevant to the user's brand, industry, audience interests, and business goals?
2. Opportunity: Does the post present an opportunity (trending discussion, viral question, content gap)?
3. Sentiment: Is the thread tone positive (constructive, celebratory), neutral (informational, discussion), or controversial (polarizing, arguments, brand callouts)?
4. Risk: Could engaging with this trend backfire? Consider political threads, brand callouts, sensitive topics, or dying threads.
5. Action: What should the user take? (Comment, create related content, share to their audience, monitor)

Be conservative — only mark posts as relevant if they clearly relate to the user's brand context.
Score 0.0-1.0 based on relevance, engagement potential, and timeliness.

For riskLevel: "low" = safe to engage, "medium" = proceed with caution, "high" = avoid or heavily vet first.
For sentiment: "positive" = constructive/uplifting, "neutral" = informational/discussion, "controversial" = polarizing/debate.`;

  if (!brandCtx) {
    return `${base}\n\nNo brand profile available — evaluate based on general social media marketing relevance.`;
  }

  const brandContext = `
IMPORTANT: Use the following brand context to evaluate relevance:

Brand: ${brandCtx.brandSummary}
Industry: ${brandCtx.identity.industry ?? "not specified"}
Voice/Tone: ${brandCtx.voice.tonePreset ?? "not specified"}
Audience Type: ${brandCtx.audience.audienceType ?? "not specified"}
Audience Interests: ${brandCtx.audience.interests?.join(", ") ?? "not specified"}
Audience Pain Points: ${brandCtx.audience.painPoints?.join(", ") ?? "not specified"}
Business Goals: ${brandCtx.goals.length > 0 ? brandCtx.goals.join(", ") : "not specified"}
Competitors: ${brandCtx.audience.competitors?.join(", ") ?? "none specified"}

Evaluate relevance by checking:
- Does the post topic align with the brand's industry or audience interests?
- Does it relate to the brand's business goals?
- Does it mention or relate to the brand's competitors?
- Would this topic resonate with the brand's target audience?

Score higher when the post directly connects to the brand's stated goals, audience interests, or industry.`;

  return `${base}${brandContext}`;
}

function buildBrandContextSnippet(brandCtx: BrandContextForAI | null): string {
  if (!brandCtx) {
    return "No brand profile available — evaluate based on general social media marketing relevance.";
  }

  return [
    `Brand Context:`,
    `  Brand: ${brandCtx.brandSummary}`,
    `  Industry: ${brandCtx.identity.industry ?? "N/A"}`,
    `  Voice: ${brandCtx.voice.tonePreset ?? "N/A"}`,
    `  Audience: ${brandCtx.audience.audienceType ?? "N/A"}${brandCtx.audience.interests?.length ? `, interested in ${brandCtx.audience.interests.join(", ")}` : ""}`,
    `  Goals: ${brandCtx.goals.length > 0 ? brandCtx.goals.join(", ") : "N/A"}`,
    `  Competitors: ${brandCtx.audience.competitors?.length ? brandCtx.audience.competitors.join(", ") : "None specified"}`,
  ].join("\n");
}

export interface AnalysisResult {
  relevanceScore: number;
  isRelevant: boolean;
  reason: string;
  brandReasonTags: string[];
  topicTags: string[];
  suggestedAction: string;
  sentiment: string;
  riskLevel: string;
  riskReason: string;
}

const fallbackResult: AnalysisResult = {
  relevanceScore: 0,
  isRelevant: false,
  reason: "Analysis failed — AI model unavailable. Review this post manually for social media relevance.",
  brandReasonTags: [],
  topicTags: [],
  suggestedAction: "Review manually",
  sentiment: "neutral",
  riskLevel: "low",
  riskReason: "Could not assess risk — AI model unavailable",
};

function extractPostId(url: string): string | null {
  const match = url.match(/\/comments\/([a-z0-9]+)/i);
  return match?.[1] ?? null;
}

function deduplicatePosts(posts: RedditPost[]): RedditPost[] {
  const seen = new Map<string, RedditPost>();

  for (const post of posts) {
    const key = extractPostId(post.url) ?? post.url;
    const existing = seen.get(key);
    if (!existing || post.upvotes > existing.upvotes) {
      seen.set(key, post);
    }
  }

  return Array.from(seen.values());
}

interface HeuristicResult {
  pass: boolean;
  keywordScore: number;
}

function runHeuristicFilter(
  post: RedditPost,
  brandCtx: BrandContextForAI | null,
): HeuristicResult {
  const titleLower = post.title.toLowerCase();

  const marketingKeywords = [
    "marketing", "social media", "content", "brand", "audience", "engagement",
    "growth", "analytics", "posting", "schedule", "algorithm", "viral",
    "tiktok", "instagram", "linkedin", "twitter", "youtube", "influencer",
    "seo", "copywriting", "creative", "campaign", "reach", "impression",
    "community", "follow", "subscribe", "creator", "monetization", "ai tool",
    "automation", "workflow", "productivity", "strategy", "trend",
  ];

  let keywordScore = 0;
  for (const keyword of marketingKeywords) {
    if (titleLower.includes(keyword)) {
      keywordScore += 1;
    }
  }

  if (brandCtx) {
    const brandKeywords = [
      ...(brandCtx.audience.interests ?? []),
      ...(brandCtx.audience.painPoints ?? []),
      ...(brandCtx.audience.competitors ?? []),
      brandCtx.identity.industry,
    ].filter((v): v is string => typeof v === "string" && v.length > 0);

    const seenKeywords = new Set<string>();
    for (const keyword of brandKeywords) {
      const kw = keyword.toLowerCase();
      if (!seenKeywords.has(kw) && titleLower.includes(kw)) {
        keywordScore += 2;
        seenKeywords.add(kw);
      }
    }

    if (brandCtx.goals.length > 0) {
      const goalKeywords = brandCtx.goals.map((g) => g.toLowerCase());
      for (const keyword of goalKeywords) {
        if (titleLower.includes(keyword) || titleLower.includes(keyword.replace("_", " "))) {
          keywordScore += 1;
        }
      }
    }
  }

  const pass = keywordScore >= 1 || post.upvotes >= 200;

  return { pass, keywordScore };
}

async function analyzePost(
  post: RedditPost,
  brandCtx: BrandContextForAI | null,
): Promise<AnalysisResult> {
  const systemPrompt = buildSystemPrompt(brandCtx);
  const brandSnippet = buildBrandContextSnippet(brandCtx);

  const userPrompt = `Analyze this Reddit post:

Title: ${post.title}
Subreddit: r/${post.subreddit}
Upvotes: ${post.upvotes}
Comments: ${post.commentCount}
Author: ${post.author}
URL: ${post.url}

${brandSnippet}`;

  try {
    const result = await structuredModel.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    logger.debug("reddit.analysis.complete", { title: post.title, relevanceScore: result.relevanceScore, sentiment: result.sentiment, riskLevel: result.riskLevel, hasBrandContext: !!brandCtx });

    return {
      relevanceScore: result.relevanceScore,
      isRelevant: result.isRelevant,
      reason: result.reason,
      brandReasonTags: result.brandReasonTags ?? [],
      topicTags: result.topicTags,
      suggestedAction: result.suggestedAction,
      sentiment: result.sentiment ?? "neutral",
      riskLevel: result.riskLevel ?? "low",
      riskReason: result.riskReason ?? "No risk factors identified",
    };
  } catch (err) {
    logger.error("reddit.analysis.error", { title: post.title, error: String(err), hasBrandContext: !!brandCtx });
    return fallbackResult;
  }
}

export async function analyzeSinglePost(
  postId: string,
  workspaceId: string,
): Promise<AnalysisResult | null> {
  const post = await prisma.redditTrendingPost.findUnique({
    where: { id: postId, workspaceId },
  });

  if (!post) {
    logger.warn("reddit.analysis.single_post_not_found", { postId, workspaceId });
    return null;
  }

  const brandCtx = await loadBrandContextForAI(workspaceId);

  const redditPost: RedditPost = {
    title: post.title,
    url: post.url,
    author: post.author,
    upvotes: post.upvotes,
    commentCount: post.commentCount,
    subreddit: post.subreddit,
    createdAt: post.scrapedAt,
  };

  const analysis = await analyzePost(redditPost, brandCtx);

  await prisma.redditTrendingPost.update({
    where: { id: postId },
    data: {
      relevanceScore: analysis.relevanceScore,
      relevanceReason: analysis.reason,
      brandReasonTags: analysis.brandReasonTags,
      isActionable: analysis.isRelevant && analysis.relevanceScore >= 0.5,
      topicTags: analysis.topicTags,
      suggestedAction: analysis.suggestedAction,
      sentiment: analysis.sentiment as "positive" | "neutral" | "controversial",
      riskLevel: analysis.riskLevel as "low" | "medium" | "high",
      riskReason: analysis.riskReason,
    },
  });

  return analysis;
}

async function analyzeBatch(
  posts: RedditPost[],
  brandCtx: BrandContextForAI | null,
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  const batchSize = 5;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const analyzed = await Promise.all(
      batch.map((post) => analyzePost(post, brandCtx)),
    );
    batch.forEach((post, j) => {
      results.set(post.url, analyzed[j]);
    });

    if (i + batchSize < posts.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

export async function processAndStoreTrendingPosts(
  workspaceId: string,
  posts: RedditPost[],
  onProgress?: (phase: "scraping" | "analyzing" | "done", counts: { total: number; analyzed: number; skipped: number }) => void,
): Promise<{ total: number; analyzed: number; skipped: number; refreshedPostIds?: string[] }> {
  if (posts.length === 0) return { total: 0, analyzed: 0, skipped: 0 };

  logger.info("reddit.trending.processing", { workspaceId, rawPostCount: posts.length });

  const dedupedPosts = deduplicatePosts(posts);
  logger.info("reddit.trending.deduped", { workspaceId, dedupedCount: dedupedPosts.length });

  const now = new Date();

  const postIds = dedupedPosts
    .map((p) => extractPostId(p.url))
    .filter((id): id is string => id !== null);

  const existingPosts = await prisma.redditTrendingPost.findMany({
    where: { workspaceId, postId: { in: postIds } },
    select: { id: true, postId: true, url: true },
  });
  const existingPostIdSet = new Set(existingPosts.map((p) => p.postId));
  const existingUrlSet = new Set(existingPosts.map((p) => p.url));

  // Partition posts into existing vs new using push instead of spread to avoid O(n²) allocations
  const existingPostsList: RedditPost[] = [];
  const newPostsList: RedditPost[] = [];

  for (const post of dedupedPosts) {
    const postId = extractPostId(post.url);
    if (postId && existingPostIdSet.has(postId)) {
      existingPostsList.push(post);
    } else if (existingUrlSet.has(post.url)) {
      existingPostsList.push(post);
    } else {
      newPostsList.push(post);
    }
  }

  if (existingPostsList.length > 0) {
    const existingPostIds = existingPostsList
      .map((p) => extractPostId(p.url))
      .filter((id): id is string => id !== null);
    
    if (existingPostIds.length > 0) {
      const refreshedIds: string[] = [];
      
      for (const existingPost of existingPosts) {
        const scrapedPost = existingPostsList.find(
          (p) => extractPostId(p.url) === existingPost.postId
        );
        
        if (scrapedPost && existingPost.postId) {
          await prisma.redditTrendingPost.update({
            where: { id: existingPost.id },
            data: {
              upvotes: scrapedPost.upvotes,
              commentCount: scrapedPost.commentCount,
              scrapedAt: now,
            },
          });
          refreshedIds.push(existingPost.id);
        }
      }
      
      logger.info("reddit.trending.cache_refreshed", {
        workspaceId,
        refreshedCount: refreshedIds.length,
      });
      
      return { 
        total: 0, 
        analyzed: 0, 
        skipped: 0,
        refreshedPostIds: refreshedIds,
      };
    }
  }

  if (newPostsList.length === 0) {
    logger.info("reddit.trending.no_new_posts", { workspaceId });
    onProgress?.("done", { total: 0, analyzed: 0, skipped: 0 });
    return { total: 0, analyzed: 0, skipped: 0 };
  }

  onProgress?.("analyzing", { total: newPostsList.length, analyzed: 0, skipped: 0 });

  const brandCtx = await loadBrandContextForAI(workspaceId);

  const heuristicResults = newPostsList.map((post) => ({
    post,
    result: runHeuristicFilter(post, brandCtx),
  }));

  const postsToAnalyze = heuristicResults.filter((h) => h.result.pass);
  const postsSkipped = heuristicResults.filter((h) => !h.result.pass);

  logger.info("reddit.trending.heuristic_filter", {
    workspaceId,
    totalNew: newPostsList.length,
    passingHeuristic: postsToAnalyze.length,
    skippedByHeuristic: postsSkipped.length,
    hasBrandContext: !!brandCtx,
  });

  const analyses = await analyzeBatch(
    postsToAnalyze.map((h) => h.post),
    brandCtx,
  );

  const records = newPostsList.map((post) => {
    const heuristicEntry = heuristicResults.find((h) => h.post.url === post.url);
    const analysisEntry = analyses.get(post.url);

    let analysis: AnalysisResult;

    if (analysisEntry) {
      analysis = analysisEntry;
    } else if (heuristicEntry && !heuristicEntry.result.pass) {
      analysis = {
        relevanceScore: Math.min(heuristicEntry.result.keywordScore * 0.15, 0.35),
        isRelevant: false,
        reason: "Filtered by heuristic — low keyword match score",
        brandReasonTags: [],
        topicTags: [],
        suggestedAction: "Monitor only",
        sentiment: "neutral",
        riskLevel: "low",
        riskReason: "Not analyzed by AI",
      };
    } else {
      analysis = {
        relevanceScore: 0,
        isRelevant: false,
        reason: "Analysis skipped",
        brandReasonTags: [],
        topicTags: [],
        suggestedAction: "Review manually",
        sentiment: "neutral",
        riskLevel: "low",
        riskReason: "Could not assess",
      };
    }

    return {
      id: crypto.randomUUID(),
      workspaceId,
      subreddit: post.subreddit,
      postId: extractPostId(post.url),
      title: post.title,
      url: post.url,
      author: post.author,
      upvotes: post.upvotes,
      commentCount: post.commentCount,
      relevanceScore: analysis.relevanceScore,
      relevanceReason: analysis.reason,
      brandReasonTags: analysis.brandReasonTags,
      isActionable: analysis.isRelevant && analysis.relevanceScore >= 0.5,
      topicTags: analysis.topicTags,
      suggestedAction: analysis.suggestedAction,
      scrapedAt: now,
      sentiment: analysis.sentiment as "positive" | "neutral" | "controversial",
      riskLevel: analysis.riskLevel as "low" | "medium" | "high",
      riskReason: analysis.riskReason,
    };
  });

  await prisma.redditTrendingPost.createMany({
    data: records,
    skipDuplicates: true,
  });

  const actionableCount = records.filter((r) => r.isActionable).length;
  logger.info("reddit.trending.stored", { workspaceId, postCount: records.length, actionableCount });

  // Phase 2: Deep Analysis - Comment scraping and scoring
  const newPostIds = records.map((r) => r.id);
  const newPostUrls = records.map((r) => ({ id: r.id, url: r.url }));

  try {
    // Scrape comments for new posts
    const { scrapeCommentsForPosts } = await import("./comment-scraper");
    await scrapeCommentsForPosts(newPostUrls);

    // Calculate engagement depth scores
    const { calculateEngagementDepthForPosts } = await import("./engagement-analyzer");
    const engagementResults = await calculateEngagementDepthForPosts(newPostIds);

    // Calculate intent scores
    const { calculateIntentScoreForPosts } = await import("./intent-scorer");
    const intentResults = await calculateIntentScoreForPosts(newPostIds);

    // Update posts with new scores
    for (const postId of newPostIds) {
      const engagement = engagementResults.get(postId);
      const intent = intentResults.get(postId);

      await prisma.redditTrendingPost.update({
        where: { id: postId },
        data: {
          engagementDepthScore: engagement?.engagementDepthScore ?? null,
          intentScore: intent?.intentScore ?? null,
          intentType: intent?.intentType ?? null,
          intentSignals: intent?.intentSignals ? JSON.parse(JSON.stringify(intent.intentSignals)) : null,
        },
      });
    }

    logger.info("reddit.trending.deep_analysis_complete", {
      workspaceId,
      postCount: newPostIds.length,
    });
  } catch (err) {
    logger.error("reddit.trending.deep_analysis_error", {
      workspaceId,
      error: String(err),
    });
    // Continue even if deep analysis fails
  }

  // Phase 3: Check alerts and trigger notifications
  try {
    await checkAndTriggerAlerts(workspaceId, newPostIds);
  } catch (err) {
    logger.error("reddit.trending.alert_check_error", {
      workspaceId,
      error: String(err),
    });
  }

  // Phase 3.3: Push notifications for high-intent leads
  try {
    await triggerHighIntentNotifications(workspaceId, newPostIds);
  } catch (err) {
    logger.error("reddit.trending.push_notification_error", {
      workspaceId,
      error: String(err),
    });
  }

  onProgress?.("done", { total: newPostsList.length, analyzed: postsToAnalyze.length, skipped: postsSkipped.length });

  return {
    total: newPostsList.length,
    analyzed: postsToAnalyze.length,
    skipped: postsSkipped.length,
    refreshedPostIds: [],
  };
}

async function checkAndTriggerAlerts(workspaceId: string, postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;

  const alerts = await prisma.redditAlert.findMany({
    where: { workspaceId, enabled: true },
  });

  if (alerts.length === 0) return;

  const posts = await prisma.redditTrendingPost.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      title: true,
      subreddit: true,
      upvotes: true,
      relevanceScore: true,
      intentScore: true,
      url: true,
    },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      userId: true,
      BrandContext: {
        select: {
          businessName: true,
          competitors: true,
        },
      },
    },
  });

  if (!workspace?.userId) return;

  const userId = workspace.userId;
  const brandName = workspace.BrandContext?.businessName?.toLowerCase();
  const competitors = (workspace.BrandContext?.competitors ?? []).map((c) => c.toLowerCase());

  for (const alert of alerts) {
    const matchedPosts = posts.filter((post) => {
      if (post.upvotes < alert.minScore) return false;
      if (alert.minIntent !== null && (post.intentScore ?? 0) < alert.minIntent) return false;

      if (alert.subreddits.length > 0 && !alert.subreddits.includes(post.subreddit)) {
        return false;
      }

      const titleLower = post.title.toLowerCase();
      const keywordMatch = alert.keywords.some((kw: string) => titleLower.includes(kw.toLowerCase()));
      if (!keywordMatch) return false;

      return true;
    });

    for (const post of matchedPosts) {
      const notifyReasons: string[] = [];

      if (alert.notifyOn.includes("high_relevance") && (post.relevanceScore ?? 0) >= 0.7) {
        notifyReasons.push("High relevance");
      }
      if (alert.notifyOn.includes("high_intent") && (post.intentScore ?? 0) >= 70) {
        notifyReasons.push("High intent lead");
      }
      if (alert.notifyOn.includes("brand_mention") && brandName && post.title.toLowerCase().includes(brandName)) {
        notifyReasons.push("Brand mention");
      }
      if (alert.notifyOn.includes("competitor_mention") && competitors.some((c) => post.title.toLowerCase().includes(c))) {
        notifyReasons.push("Competitor mention");
      }

      if (notifyReasons.length === 0) continue;

      try {
        const { createNotification } = await import("@/lib/notifications/server-dispatch");
        await createNotification({
          userId,
          type: "info",
          category: "ai_insight",
          title: `Alert "${alert.name}": ${post.title}`,
          description: `${notifyReasons.join(", ")} in r/${post.subreddit}`,
          actionUrl: post.url,
          workspaceId,
        });

        await prisma.redditAlert.update({
          where: { id: alert.id },
          data: { lastTriggered: new Date() },
        });

        logger.info("reddit.alert.triggered", {
          alertId: alert.id,
          postId: post.id,
          reasons: notifyReasons,
        });
      } catch (err) {
        logger.error("reddit.alert.notification_error", {
          alertId: alert.id,
          postId: post.id,
          error: String(err),
        });
      }
    }
  }
}

async function triggerHighIntentNotifications(workspaceId: string, postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;

  const highIntentPosts = await prisma.redditTrendingPost.findMany({
    where: {
      id: { in: postIds },
      intentScore: { gte: 80 },
      relevanceScore: { gte: 0.7 },
    },
    select: {
      id: true,
      title: true,
      subreddit: true,
      intentScore: true,
      relevanceScore: true,
      url: true,
    },
  });

  if (highIntentPosts.length === 0) return;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });

  if (!workspace?.userId) return;

  const userId = workspace.userId;

  for (const post of highIntentPosts) {
    try {
      const { createNotification } = await import("@/lib/notifications/server-dispatch");
      await createNotification({
        userId,
        type: "success",
        category: "ai_insight",
        title: `High-intent lead detected in r/${post.subreddit}`,
        description: `"${post.title}" - Intent: ${post.intentScore}/100, Relevance: ${Math.round((post.relevanceScore ?? 0) * 100)}%`,
        actionUrl: post.url,
        workspaceId,
      });

      logger.info("reddit.high_intent.notification_sent", {
        postId: post.id,
        intentScore: post.intentScore,
        relevanceScore: post.relevanceScore,
      });
    } catch (err) {
      logger.error("reddit.high_intent.notification_error", {
        postId: post.id,
        error: String(err),
      });
    }
  }
}
