import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface PostData {
  id: string;
  title: string;
  subreddit: string;
  upvotes: number;
  relevanceScore: number | null;
  topicTags: string[];
}

interface Cluster {
  topic: string;
  keywords: string[];
  posts: PostData[];
  subreddits: string[];
  avgRelevance: number;
  totalUpvotes: number;
}

const MIN_CLUSTER_SIZE = 3;
const MIN_KEYWORD_OVERLAP = 0.3;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "this", "that", "these",
  "those", "i", "you", "he", "she", "it", "we", "they", "what", "which",
  "who", "when", "where", "why", "how", "not", "no", "yes", "as", "if",
  "then", "than", "too", "very", "just", "about", "up", "on", "off",
]);

export async function analyzeAndStoreClusters(workspaceId: string): Promise<Cluster[]> {
  logger.info("reddit.clustering.starting", { workspaceId });

  const recentPosts = await prisma.redditTrendingPost.findMany({
    where: {
      workspaceId,
      scrapedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      title: true,
      subreddit: true,
      upvotes: true,
      relevanceScore: true,
      topicTags: true,
    },
    orderBy: { scrapedAt: "desc" },
  });

  if (recentPosts.length < MIN_CLUSTER_SIZE) {
    logger.info("reddit.clustering.insufficient_posts", {
      workspaceId,
      count: recentPosts.length,
    });
    return [];
  }

  const clusters = findClusters(recentPosts);

  if (clusters.length === 0) {
    logger.info("reddit.clustering.no_clusters", { workspaceId });
    return [];
  }

  await prisma.redditTrendCluster.deleteMany({
    where: { workspaceId },
  });

  const clusterData = clusters.map((cluster) => ({
    id: crypto.randomUUID(),
    workspaceId,
    topic: cluster.topic,
    keywords: cluster.keywords,
    postIds: cluster.posts.map((p) => p.id),
    subreddits: cluster.subreddits,
    avgRelevance: cluster.avgRelevance,
    totalUpvotes: cluster.totalUpvotes,
  }));

  await prisma.redditTrendCluster.createMany({
    data: clusterData,
  });

  logger.info("reddit.clustering.completed", {
    workspaceId,
    clusterCount: clusters.length,
    totalPosts: recentPosts.length,
  });

  return clusters;
}

function findClusters(posts: PostData[]): Cluster[] {
  const clusters: Cluster[] = [];
  const used = new Set<string>();

  for (let i = 0; i < posts.length; i++) {
    if (used.has(posts[i].id)) continue;

    const seedPost = posts[i];
    const seedKeywords = extractKeywords(seedPost.title);
    const seedTags = new Set(seedPost.topicTags.map((t) => t.toLowerCase()));

    const cluster: PostData[] = [seedPost];
    const subreddits = new Set([seedPost.subreddit]);

    for (let j = i + 1; j < posts.length; j++) {
      if (used.has(posts[j].id)) continue;

      const candidatePost = posts[j];
      const candidateKeywords = extractKeywords(candidatePost.title);
      const candidateTags = new Set(candidatePost.topicTags.map((t) => t.toLowerCase()));

      const keywordOverlap = calculateOverlap(seedKeywords, candidateKeywords);
      const tagOverlap = calculateTagOverlap(seedTags, candidateTags);

      const similarity = Math.max(keywordOverlap, tagOverlap);

      if (similarity >= MIN_KEYWORD_OVERLAP) {
        cluster.push(candidatePost);
        subreddits.add(candidatePost.subreddit);
        used.add(candidatePost.id);
      }
    }

    if (cluster.length >= MIN_CLUSTER_SIZE && subreddits.size >= 2) {
      used.add(seedPost.id);

      const topic = generateTopicLabel(cluster);
      const allKeywords = cluster.flatMap((p) => Array.from(extractKeywords(p.title)));
      const keywordFrequency = new Map<string, number>();
      for (const kw of allKeywords) {
        keywordFrequency.set(kw, (keywordFrequency.get(kw) || 0) + 1);
      }
      const keywords = Array.from(keywordFrequency.entries())
        .filter(([_, count]) => count >= 2)
        .map(([kw]) => kw)
        .slice(0, 10);

      const avgRelevance =
        cluster.reduce((sum, p) => sum + (p.relevanceScore || 0), 0) / cluster.length;
      const totalUpvotes = cluster.reduce((sum, p) => sum + p.upvotes, 0);

      clusters.push({
        topic,
        keywords,
        posts: cluster,
        subreddits: Array.from(subreddits),
        avgRelevance,
        totalUpvotes,
      });
    }
  }

  return clusters.sort((a, b) => b.totalUpvotes - a.totalUpvotes);
}

function extractKeywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
  );
}

function calculateOverlap(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }

  const union = new Set([...set1, ...set2]).size;
  return intersection / union;
}

function calculateTagOverlap(tags1: Set<string>, tags2: Set<string>): number {
  if (tags1.size === 0 || tags2.size === 0) return 0;

  let intersection = 0;
  for (const tag of tags1) {
    if (tags2.has(tag)) intersection++;
  }

  return intersection / Math.min(tags1.size, tags2.size);
}

function generateTopicLabel(posts: PostData[]): string {
  const allKeywords = posts.flatMap((p) => Array.from(extractKeywords(p.title)));
  const frequency = new Map<string, number>();

  for (const kw of allKeywords) {
    frequency.set(kw, (frequency.get(kw) || 0) + 1);
  }

  const topKeywords = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => kw);

  return topKeywords.length > 0
    ? topKeywords.join(" / ")
    : "Cross-Community Trend";
}
