import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadBrandContextForAI } from "@/lib/ai/brand-context-loader";
import { logger } from "@/lib/logger";

const SubredditRecommendationSchema = z.object({
  subreddit: z.string().describe("Subreddit name without r/ prefix"),
  relevanceScore: z.number().min(0).max(1).describe("Relevance score from 0 to 1"),
  reason: z.string().describe("Why this subreddit is relevant to the brand"),
  category: z.enum(["industry", "audience", "goals", "competitors"]).describe("Category of recommendation"),
});

const RecommendationsOutputSchema = z.object({
  recommendations: z.array(SubredditRecommendationSchema).max(10),
});

// In-memory cache: workspaceId -> { recommendations, expires }
const cache = new Map<string, { recommendations: z.infer<typeof SubredditRecommendationSchema>[]; expires: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100; // Prevent unbounded growth

/**
 * Evict expired entries from the cache.
 * Called before adding new entries to prevent memory leaks.
 */
function evictExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expires < now) {
      cache.delete(key);
    }
  }
}

/**
 * Evict oldest entries if cache exceeds max size.
 * Uses LRU-style eviction by deleting the oldest entries.
 */
function evictOldestCache(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  
  // Sort by expiration time and delete oldest
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].expires - b[1].expires);
  
  const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
  for (const [key] of toDelete) {
    cache.delete(key);
  }
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.3,
  maxRetries: 1,
});

const structuredModel = model.withStructuredOutput(RecommendationsOutputSchema, {
  name: "recommend_subreddits",
});

function buildRecommendationPrompt(
  brandCtx: NonNullable<Awaited<ReturnType<typeof loadBrandContextForAI>>>,
  trackedSubreddits: string[],
): string {
  const trackedList = trackedSubreddits.length > 0 ? trackedSubreddits.join(", ") : "none";

  return `You are SocialBeam's subreddit recommendation engine. Given a brand's profile, recommend up to 10 subreddits that would be valuable for trend monitoring and content inspiration.

Brand: ${brandCtx.brandSummary}
Industry: ${brandCtx.identity.industry ?? "not specified"}
Audience Type: ${brandCtx.audience.audienceType ?? "not specified"}
Audience Interests: ${brandCtx.audience.interests?.join(", ") ?? "not specified"}
Audience Pain Points: ${brandCtx.audience.painPoints?.join(", ") ?? "not specified"}
Business Goals: ${brandCtx.goals.length > 0 ? brandCtx.goals.join(", ") : "not specified"}
Competitors: ${brandCtx.audience.competitors?.join(", ") ?? "none specified"}

Currently tracked subreddits: ${trackedList}

Criteria:
- Subreddits must be active communities with real discussion (10k+ members preferred)
- Focus on communities where industry-relevant discussions happen regularly
- Include both broad industry subs and niche interest subs that match the brand
- Exclude NSFW, political, or brand-specific subreddits
- Do NOT recommend subreddits already in the tracked list
- Prioritize subreddits where social media managers can find trending topics and content ideas
- Only recommend real, existing subreddits that actually exist on Reddit

Categorize each recommendation:
- "industry": Directly related to the brand's industry
- "audience": Where the target audience hangs out or discusses their interests/pain points
- "goals": Subreddits that help achieve specific business goals
- "competitors": Subreddits where competitor discussions or industry comparisons happen

Return structured recommendations with relevance scores and reasoning.`;
}

export interface SubredditRecommendation {
  subreddit: string;
  relevanceScore: number;
  reason: string;
  category: "industry" | "audience" | "goals" | "competitors";
  isTracked: boolean;
}

export async function recommendSubreddits(workspaceId: string): Promise<SubredditRecommendation[]> {
  const cachedEntry = cache.get(workspaceId);
  if (cachedEntry && cachedEntry.expires > Date.now()) {
    logger.debug("reddit.recommendations.cache_hit", { workspaceId });
    const recommendations = cachedEntry.recommendations;
    return enrichWithTrackedStatus(recommendations, workspaceId);
  }

  const brandCtx = await loadBrandContextForAI(workspaceId);
  if (!brandCtx) {
    logger.debug("reddit.recommendations.no_brand_context", { workspaceId });
    return [];
  }

  const trackedSubreddits = await getTrackedSubreddits(workspaceId);

  const systemPrompt = `You are SocialBeam's subreddit recommendation engine. Given a brand's profile, recommend up to 10 subreddits that would be valuable for trend monitoring and content inspiration.`;

  const userPrompt = buildRecommendationPrompt(brandCtx, trackedSubreddits);

  try {
    const result = await structuredModel.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let recommendations = result.recommendations;

    // Filter out already tracked subreddits
    const trackedSet = new Set(trackedSubreddits.map((s) => s.toLowerCase()));
    recommendations = recommendations.filter(
      (r) => !trackedSet.has(r.subreddit.toLowerCase())
    );

    // Sort by relevance score descending
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Evict expired entries and enforce cache size limit before adding new entry
    evictExpiredCache();
    evictOldestCache();

    // Cache the results
    cache.set(workspaceId, {
      recommendations,
      expires: Date.now() + CACHE_TTL_MS,
    });

    // Auto-add recommended subreddits to DB
    await autoAddRecommendations(workspaceId, recommendations);

    logger.info("reddit.recommendations.success", {
      workspaceId,
      recommendationCount: recommendations.length,
      hasBrandContext: true,
    });

    return enrichWithTrackedStatus(recommendations, workspaceId);
  } catch (err) {
    logger.error("reddit.recommendations.error", {
      workspaceId,
      error: String(err),
    });
    return [];
  }
}

async function getTrackedSubreddits(workspaceId: string): Promise<string[]> {
  const configs = await prisma.redditSubredditConfig.findMany({
    where: { workspaceId, isActive: true },
    select: { subreddit: true },
    orderBy: { subreddit: "asc" },
  });
  return configs.map((c) => c.subreddit);
}

async function autoAddRecommendations(
  workspaceId: string,
  recommendations: z.infer<typeof SubredditRecommendationSchema>[],
): Promise<void> {
  if (recommendations.length === 0) return;

  for (const rec of recommendations) {
    try {
      await prisma.redditSubredditConfig.upsert({
        where: {
          workspaceId_subreddit: {
            workspaceId,
            subreddit: rec.subreddit.toLowerCase(),
          },
        },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          subreddit: rec.subreddit.toLowerCase(),
          sortOrder: "hot",
          isActive: true,
          source: "recommended",
          relevanceScore: rec.relevanceScore,
        },
        update: {},
      });
    } catch (err) {
      logger.warn("reddit.recommendations.upsert_error", {
        workspaceId,
        subreddit: rec.subreddit,
        error: String(err),
      });
    }
  }
}

async function enrichWithTrackedStatus(
  recommendations: z.infer<typeof SubredditRecommendationSchema>[],
  workspaceId: string,
): Promise<SubredditRecommendation[]> {
  const configs = await prisma.redditSubredditConfig.findMany({
    where: { workspaceId },
    select: { subreddit: true },
  });
  const trackedSet = new Set(configs.map((c) => c.subreddit.toLowerCase()));

  return recommendations.map((r) => ({
    subreddit: r.subreddit,
    relevanceScore: r.relevanceScore,
    reason: r.reason,
    category: r.category,
    isTracked: trackedSet.has(r.subreddit.toLowerCase()),
  }));
}

export function clearRecommendationCache(workspaceId?: string): void {
  if (workspaceId) {
    cache.delete(workspaceId);
  } else {
    cache.clear();
  }
}
