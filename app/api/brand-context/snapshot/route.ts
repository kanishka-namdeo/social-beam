import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { snapshotBrandContext } from "@/lib/db/brand-context";
import { logger } from "@/lib/logger";
import { z } from "zod";

const SnapshotSchema = z.object({
  changeReason: z.string().optional(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/brand-context/snapshot" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = SnapshotSchema.safeParse(body);
    const changeReason = parsed.success ? parsed.data.changeReason : undefined;

    const version = await snapshotBrandContext(workspaceId, changeReason);

    if (!version) {
      return NextResponse.json({ error: "No brand context to snapshot" }, { status: 404 });
    }

    log.info("api.request.success", { workspaceId, versionId: version.id });
    return NextResponse.json({ success: true, versionNumber: version.id });
  } catch (err) {
    log.error("api.request.error", { path: "/api/brand-context/snapshot", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
