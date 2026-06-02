import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { syncEngagement } from "@/lib/inbox/fetchers/sync-engagement";

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.fetch.start", { method: "POST", path: "/api/inbox/fetch" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const result = await syncEngagement(workspaceId);

    log.info("api.inbox.fetch.complete", {
      workspaceId,
      totalNew: result.totalNew,
      totalErrors: result.totalErrors,
    });

    return NextResponse.json(result);
  } catch (err) {
    log.error("api.inbox.fetch.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
