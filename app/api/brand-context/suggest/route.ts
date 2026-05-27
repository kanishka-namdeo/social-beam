import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getBrandContext } from "@/lib/db/brand-context";
import { getSuggestions } from "@/lib/brand/learning-signal-aggregator";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "GET", path: "/api/brand-context/suggest" });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const brandContext = await getBrandContext(workspaceId);
    if (!brandContext) {
      log.info("api.request.success", { workspaceId, reason: "no_brand_context" });
      return NextResponse.json({ data: { suggestions: [] } });
    }

    const suggestions = await getSuggestions(brandContext.id);

    log.info("api.request.success", {
      workspaceId,
      brandContextId: brandContext.id,
      suggestionCount: suggestions.length,
    });

    return NextResponse.json({
      data: {
        suggestions,
        hasSuggestions: suggestions.length > 0,
      },
    });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/suggest", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
