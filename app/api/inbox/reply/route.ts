import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { createInboxAdapter } from "@/lib/inbox/adapters";

const ReplySchema = z.object({
  engagementItemId: z.string(),
  text: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.reply.start", { method: "POST", path: "/api/inbox/reply" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = ReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { engagementItemId, text } = parsed.data;

    const item = await prisma.engagementItem.findUnique({
      where: { id: engagementItemId, workspaceId },
    });
    if (!item) {
      return NextResponse.json({ error: "Engagement item not found" }, { status: 404 });
    }

    // Reply to the platform
    const adapter = await createInboxAdapter(item.platform as Parameters<typeof createInboxAdapter>[0], workspaceId);
    if (!adapter) {
      return NextResponse.json({ error: "Platform adapter not available" }, { status: 500 });
    }

    let result: { success: boolean; error?: string };
    if (item.type === "DM") {
      result = await adapter.replyToDM(item.parentId ?? item.platformItemId, text);
    } else {
      result = await adapter.replyToComment(item.platformItemId, text);
    }

    if (!result.success) {
      log.error("api.inbox.reply.platform_failed", {
        workspaceId,
        engagementItemId,
        error: result.error,
      });
      return NextResponse.json(
        { error: "Failed to send reply", details: result.error },
        { status: 502 },
      );
    }

    // Update the engagement item
    await prisma.engagementItem.update({
      where: { id: engagementItemId },
      data: {
        status: "REPLIED",
        repliedAt: new Date(),
      },
    });

    log.info("api.inbox.reply.complete", { workspaceId, engagementItemId });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("api.inbox.reply.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
