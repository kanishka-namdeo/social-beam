import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getBrandContextHistory } from "@/lib/db/brand-context";
import { logger } from "@/lib/logger";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const history = await getBrandContextHistory(workspaceId, 20);

    log.info("api.brand_context.history.success", {
      workspaceId,
      count: history.length,
    });

    return NextResponse.json({ data: history });
  } catch (err) {
    log.error("api.brand_context.history.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
