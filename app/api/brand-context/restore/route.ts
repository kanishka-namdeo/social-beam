import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { restoreBrandContext } from "@/lib/db/brand-context";
import { logger } from "@/lib/logger";
import { z } from "zod";

const RestoreSchema = z.object({
  versionId: z.string(),
});

export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = RestoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    await restoreBrandContext(workspaceId, parsed.data.versionId);

    log.info("api.brand_context.restore.success", {
      workspaceId,
      versionId: parsed.data.versionId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("api.brand_context.restore.error", { error: String(err) });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
