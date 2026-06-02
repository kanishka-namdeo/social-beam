import { NextResponse } from "next/server";
import { searchProvider, type ProviderName } from "@/lib/media/external-providers";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as ProviderName | null;
    const query = url.searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

    if (!provider || !["unsplash", "pexels", "giphy"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Use: unsplash, pexels, giphy" },
        { status: 400 },
      );
    }

    const result = await searchProvider(provider, query, page);

    log.info("api.media.external.search", {
      provider,
      query,
      page,
      total: result.total,
      returned: result.items.length,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";

    if (message.includes("Missing API key")) {
      return NextResponse.json(
        { error: "not_configured", message: "API key not configured. Please add the required environment variable." },
        { status: 503 },
      );
    }

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: "rate_limited", message },
        { status: 429 },
      );
    }

    log.error("api.media.external.search.error", { error: message });
    return NextResponse.json({ error: "search_failed", message }, { status: 500 });
  }
}
