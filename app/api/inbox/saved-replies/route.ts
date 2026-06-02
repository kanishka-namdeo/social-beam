import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  tags: z.array(z.string()).default([]),
  platform: z.string().optional(),
});

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.saved-replies.start", { method: "GET" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const savedReplies = await prisma.savedReply.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ savedReplies });
  } catch (err) {
    log.error("api.inbox.saved-replies.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.saved-replies.create.start", { method: "POST" });

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
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const savedReply = await prisma.savedReply.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        ...parsed.data,
      },
    });

    log.info("api.inbox.saved-replies.create.complete", { id: savedReply.id });

    return NextResponse.json({ savedReply }, { status: 201 });
  } catch (err) {
    log.error("api.inbox.saved-replies.create.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
