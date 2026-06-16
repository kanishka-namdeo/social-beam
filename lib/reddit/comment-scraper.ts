import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface RedditCommentData {
  redditId: string;
  author: string;
  body: string;
  score: number;
  depth: number;
  parentId: string | null;
  replyCount: number;
  createdAt: Date;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
];

function extractPostIdFromUrl(url: string): string | null {
  const match = url.match(/\/comments\/([a-z0-9]+)/i);
  return match?.[1] ?? null;
}

async function fetchCommentsFromApi(postUrl: string): Promise<RedditCommentData[]> {
  const postId = extractPostIdFromUrl(postUrl);
  if (!postId) {
    return [];
  }

  const url = `https://www.reddit.com/comments/${postId}.json?limit=20&depth=3&sort=best`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Comments API returned ${res.status}`);
  }

  const json = (await res.json()) as Array<{ data?: { children?: Array<{ data?: Record<string, unknown>; kind?: string }> } }>;

  if (!Array.isArray(json) || json.length < 2) {
    return [];
  }

  const commentListing = json[1];
  const children = commentListing?.data?.children ?? [];

  const comments: RedditCommentData[] = [];

  function traverseComment(comment: Record<string, unknown>, depth: number = 0) {
    const id = comment.id as string;
    const author = (comment.author as string) ?? "[deleted]";
    const body = (comment.body as string) ?? "";
    const score = (comment.score as number) ?? 0;
    const parentId = (comment.parent_id as string)?.replace(/^t1_/, "") ?? null;
    const createdUtc = comment.created_utc as number;
    const replies = comment.replies as { data?: { children?: Array<{ data?: Record<string, unknown>; kind?: string }> } } | string;

    if (!id || !body) return;

    let replyCount = 0;
    if (typeof replies === "object" && replies?.data?.children) {
      replyCount = replies.data.children.filter((c) => c.kind === "t1").length;
    }

    comments.push({
      redditId: id,
      author,
      body,
      score,
      depth,
      parentId,
      replyCount,
      createdAt: createdUtc ? new Date(createdUtc * 1000) : new Date(),
    });

    if (typeof replies === "object" && replies?.data?.children && depth < 3) {
      for (const child of replies.data.children) {
        if (child.kind === "t1" && child.data) {
          traverseComment(child.data, depth + 1);
        }
      }
    }
  }

  for (const child of children) {
    if (child.kind === "t1" && child.data) {
      traverseComment(child.data, 0);
    }
  }

  return comments.slice(0, 20);
}

export async function scrapeCommentsForPost(
  postUrl: string,
  dbPostId: string
): Promise<number> {
  logger.debug("reddit.comment_scraper.start", { postUrl, dbPostId });

  try {
    const comments = await fetchCommentsFromApi(postUrl);

    if (comments.length === 0) {
      logger.debug("reddit.comment_scraper.no_comments", { postUrl });
      return 0;
    }

    await prisma.redditComment.createMany({
      data: comments.map((comment) => ({
        postId: dbPostId,
        redditId: comment.redditId,
        author: comment.author,
        body: comment.body,
        score: comment.score,
        depth: comment.depth,
        parentId: comment.parentId,
        replyCount: comment.replyCount,
        createdAt: comment.createdAt,
      })),
      skipDuplicates: true,
    });

    logger.info("reddit.comment_scraper.complete", {
      postUrl,
      dbPostId,
      commentCount: comments.length,
    });

    return comments.length;
  } catch (err) {
    logger.error("reddit.comment_scraper.error", {
      postUrl,
      dbPostId,
      error: String(err),
    });
    return 0;
  }
}

export async function scrapeCommentsForPosts(
  posts: Array<{ url: string; id: string }>
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  for (const post of posts) {
    const count = await scrapeCommentsForPost(post.url, post.id);
    results.set(post.id, count);

    if (posts.indexOf(post) < posts.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}
