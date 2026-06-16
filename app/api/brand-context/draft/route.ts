import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getBrandDraft, deleteBrandDraft } from "@/lib/db/brand-context";

// GET: Check if draft exists
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const draft = await getBrandDraft(workspaceId);
    return NextResponse.json({
      hasDraft: !!draft,
      checkpointStep: draft?.checkpointStep ?? null,
      createdAt: draft?.createdAt ?? null,
      inputUrl: draft?.inputUrl ?? null,
    });
  } catch (err) {
    logger.error("api.draft.get_error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Discard draft
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    await deleteBrandDraft(workspaceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("api.draft.delete_error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
