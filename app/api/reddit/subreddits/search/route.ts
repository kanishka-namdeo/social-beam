import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

// In-memory cache: query -> { results, expires }
const searchCache = new Map<string, { results: SubredditSearchResult[]; expires: number }>();

interface SubredditSearchResult {
  name: string;
  title: string;
  description: string;
  subscribers?: number;
  activeUsers?: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 500;

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/subreddits/search" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim();
    const limitParam = url.searchParams.get("limit");
    const excludeParam = url.searchParams.get("exclude");

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    const limit = Math.min(parseInt(limitParam ?? "15", 10), 25);
    const exclude = excludeParam
      ? excludeParam.split(",").map((s) => s.trim().toLowerCase())
      : [];

    // Check cache first
    const cacheKey = `${query}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      log.info("reddit.search.cache_hit", { query });
      const filtered = cached.results.filter((r) => !exclude.includes(r.name));
      return NextResponse.json({ data: { results: filtered, hasMore: false } });
    }

    const redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      log.warn("reddit.search.rate_limited", { query });
      return NextResponse.json(
        { error: "Reddit rate limit reached. Try adding subreddits by name instead." },
        { status: 429 }
      );
    }

    if (!res.ok) {
      log.warn("reddit.search.error", { query, status: res.status });
      return NextResponse.json(
        { error: "Failed to search subreddits" },
        { status: 502 }
      );
    }

    const json = (await res.json()) as {
      data?: {
        children?: Array<{
          data?: {
            display_name?: string;
            title?: string;
            public_description?: string;
            subscribers?: number;
            active_user_count?: number;
            over18?: boolean;
          };
        }>;
      };
    };

    const children = json?.data?.children ?? [];
    const results: SubredditSearchResult[] = children
      .map((child) => child.data)
      .filter((d): d is NonNullable<typeof d> => !!d && !d.over18)
      .map((d) => ({
        name: (d.display_name ?? "").toLowerCase(),
        title: d.title ?? "",
        description: d.public_description ?? "",
        subscribers: d.subscribers,
        activeUsers: d.active_user_count,
      }))
      .filter((r) => r.name && !exclude.includes(r.name))
      .slice(0, limit);

    // Store in cache (evict oldest if at capacity)
    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey !== undefined) {
        searchCache.delete(oldestKey);
      }
    }
    searchCache.set(cacheKey, {
      results,
      expires: Date.now() + CACHE_TTL_MS,
    });

    // Clean up expired entries
    for (const [key, value] of searchCache) {
      if (value.expires <= Date.now()) {
        searchCache.delete(key);
      }
    }

    log.info("reddit.search.success", { query, resultCount: results.length });

    return NextResponse.json({
      data: {
        results,
        hasMore: children.length > limit,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      log.warn("reddit.search.timeout", { path: "/api/reddit/subreddits/search" });
      return NextResponse.json(
        { error: "Request timed out. Try adding by name instead." },
        { status: 504 }
      );
    }
    logger.error("api.request.error", { path: "/api/reddit/subreddits/search", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
