import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface TrendingContext {
  topics: string[];
  source: string;
  fetchedAt: Date;
}

/**
 * Fetch trending context from Reddit communities connected to the workspace.
 * Extracts top trending topics/themes to inform campaign generation.
 */
export async function fetchTrendingContext(
  workspaceId: string
): Promise<TrendingContext> {
  const emptyContext: TrendingContext = {
    topics: [],
    source: "none",
    fetchedAt: new Date(),
  };

  try {
    // Check if workspace has Reddit subreddit configs
    const subredditConfigs = await prisma.redditSubredditConfig.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        subreddit: true,
      },
    });

    if (subredditConfigs.length === 0) {
      logger.debug("campaign.trends.no_subreddit_configs", { workspaceId });
      return emptyContext;
    }

    const subreddits = subredditConfigs.map((c) => c.subreddit);

    // Fetch recent trending posts from these subreddits (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingPosts = await prisma.redditTrendingPost.findMany({
      where: {
        workspaceId,
        subreddit: {
          in: subreddits,
        },
        scrapedAt: {
          gte: sevenDaysAgo,
        },
        relevanceScore: {
          gte: 0.5, // Only consider relevant posts
        },
      },
      select: {
        title: true,
        topicTags: true,
        upvotes: true,
        commentCount: true,
        subreddit: true,
      },
      orderBy: {
        upvotes: "desc",
      },
      take: 20,
    });

    if (trendingPosts.length === 0) {
      logger.debug("campaign.trends.no_trending_posts", {
        workspaceId,
        subreddits,
      });
      return emptyContext;
    }

    // Extract and deduplicate topics
    const topicCounts = new Map<string, number>();

    for (const post of trendingPosts) {
      // Use topicTags if available
      if (post.topicTags && post.topicTags.length > 0) {
        for (const tag of post.topicTags) {
          const normalized = tag.toLowerCase().trim();
          topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
        }
      }

      // Also extract keywords from title (simple heuristic)
      const titleWords = extractKeywords(post.title);
      for (const word of titleWords) {
        topicCounts.set(word, (topicCounts.get(word) || 0) + 0.5); // Lower weight for title keywords
      }
    }

    // Sort by frequency and take top 5
    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    logger.info("campaign.trends.fetched", {
      workspaceId,
      topicCount: topTopics.length,
      topics: topTopics,
      source: "reddit",
      postCount: trendingPosts.length,
    });

    return {
      topics: topTopics,
      source: "reddit",
      fetchedAt: new Date(),
    };
  } catch (error) {
    logger.error("campaign.trends.fetch_error", {
      workspaceId,
      error: String(error),
    });
    return emptyContext;
  }
}

/**
 * Extract meaningful keywords from a title.
 * Simple heuristic: remove common words, keep nouns/verbs.
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "its",
    "our",
    "their",
    "what",
    "which",
    "who",
    "whom",
    "when",
    "where",
    "why",
    "how",
    "not",
    "no",
    "nor",
    "as",
    "if",
    "then",
    "than",
    "too",
    "very",
    "just",
    "about",
    "up",
    "out",
    "so",
    "get",
    "got",
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Return unique words
  return Array.from(new Set(words));
}
