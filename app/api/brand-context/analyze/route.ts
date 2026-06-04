import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandAnalyzerGraph } from "@/lib/agent/brand-analyzer-graph";
import { shutdownCrawler } from "@/lib/agent/crawler";
import { requirePremium } from "@/lib/api-guards";

const AnalyzeRequestSchema = z.object({
  websiteUrl: z.string().url("Must be a valid URL"),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/brand-context/analyze" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const premiumGuard = await requirePremium();
    if (premiumGuard) return premiumGuard;

    const body = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { websiteUrl } = parsed.data;

    log.info("api.brand_analyze.start", { workspaceId, websiteUrl });

    const graph = await getBrandAnalyzerGraph();
    const threadId = `brand-analyze-${workspaceId}-${Date.now()}`;

    try {
      const result = await graph.invoke(
        {
          websiteUrl,
          workspaceId,
          userId: session.user.id ?? "unknown",
          correlationId: requestId,
        },
        { configurable: { thread_id: threadId } },
      );

      await shutdownCrawler();

      log.info("api.brand_analyze.complete", {
        workspaceId,
        step: result.currentStep,
        brandContextFields: Object.keys(result.brandContextDraft).length,
        platformCount: Object.keys(result.platformContextsDraft).length,
        samplePostCount: result.samplePosts.length,
      });

      if (result.currentStep === "error") {
        return NextResponse.json(
          { error: "Brand analysis failed. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        data: {
          brandContextDraft: result.brandContextDraft,
          platformContextsDraft: result.platformContextsDraft,
          samplePosts: result.samplePosts,
          connectedPlatforms: result.connectedPlatforms,
          accountDetails: result.connectedAccountDetails,
          status: result.currentStep,
        },
      });
    } catch (graphErr) {
      await shutdownCrawler();
      throw graphErr;
    }
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/analyze", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
