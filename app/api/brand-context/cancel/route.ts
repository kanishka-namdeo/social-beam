import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { shutdownCrawler } from "@/lib/agent/crawler";

const CancelRequestSchema = z.object({
  threadId: z.string().min(1),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CancelRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { threadId } = parsed.data;
    const log = logger.child({ requestId });
    log.info("api.brand_cancel.start", { threadId, workspaceId });

    // Stop any active crawler immediately
    await shutdownCrawler();

    log.info("api.brand_cancel.complete", { threadId });

    return NextResponse.json({ success: true, threadId });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/cancel", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
