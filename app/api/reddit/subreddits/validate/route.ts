import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/subreddits/validate" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const url = new URL(req.url);
    const name = url.searchParams.get("name")?.trim().toLowerCase().replace(/^r\//, "");

    if (!name) {
      return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return NextResponse.json({ error: "Invalid subreddit name" }, { status: 400 });
    }

    const redditUrl = `https://www.reddit.com/r/${name}/about.json`;
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      log.warn("reddit.validate.rate_limited", { name });
      return NextResponse.json(
        { error: "Reddit rate limit reached. Try adding by name instead." },
        { status: 429 }
      );
    }

    if (res.status === 404 || res.status === 403) {
      log.info("reddit.validate.not_found", { name, status: res.status });
      return NextResponse.json({ data: { exists: false } });
    }

    if (!res.ok) {
      log.warn("reddit.validate.error", { name, status: res.status });
      return NextResponse.json(
        { error: "Failed to validate subreddit" },
        { status: 502 }
      );
    }

    const json = (await res.json()) as { data?: { display_name?: string; title?: string; subscribers?: number } };
    const data = json?.data;

    log.info("reddit.validate.success", { name, exists: !!data });

    return NextResponse.json({
      data: {
        exists: !!data,
        displayName: data?.display_name ?? name,
        title: data?.title ?? undefined,
        subscribers: data?.subscribers ?? undefined,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      log.warn("reddit.validate.timeout", { path: "/api/reddit/subreddits/validate" });
      return NextResponse.json(
        { error: "Request timed out. Try adding by name instead." },
        { status: 504 }
      );
    }
    logger.error("api.request.error", { path: "/api/reddit/subreddits/validate", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
