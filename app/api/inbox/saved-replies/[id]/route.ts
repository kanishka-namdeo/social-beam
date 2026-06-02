import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  tags: z.array(z.string()).optional(),
  platform: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const savedReply = await prisma.savedReply.findUnique({
      where: { id, workspaceId },
    });
    if (!savedReply) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ savedReply });
  } catch (err) {
    log.error("api.inbox.saved-replies.id.get.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const savedReply = await prisma.savedReply.update({
      where: { id, workspaceId },
      data: parsed.data,
    });

    return NextResponse.json({ savedReply });
  } catch (err) {
    log.error("api.inbox.saved-replies.id.patch.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    await prisma.savedReply.delete({
      where: { id, workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("api.inbox.saved-replies.id.delete.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
