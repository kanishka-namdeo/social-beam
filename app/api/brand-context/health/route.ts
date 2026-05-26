import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkBrandHealth } from "@/lib/brand/health-checker";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/brand-context/health" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const health = await checkBrandHealth(workspaceId);

    log.info("api.request.success", {
      workspaceId,
      score: health.score,
      status: health.status,
    });
    return NextResponse.json({ data: health });
  } catch (err) {
    logger.error("api.request.error", {
      path: "/api/brand-context/health",
      error: String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
