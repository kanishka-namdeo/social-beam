import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.inbox.messages.start", { method: "GET", path: "/api/inbox/messages" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

    const where: Record<string, unknown> = { workspaceId };
    if (platform) where.platform = platform.toUpperCase();
    if (type) where.type = type.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" as const } },
        { authorName: { contains: search, mode: "insensitive" as const } },
        { parentContent: { contains: search, mode: "insensitive" as const } },
      ];
    }
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const items = await prisma.engagementItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        id: true,
        workspaceId: true,
        platform: true,
        type: true,
        platformItemId: true,
        platformUrl: true,
        authorName: true,
        authorAvatar: true,
        authorProfileUrl: true,
        authorHandle: true,
        content: true,
        parentContent: true,
        parentId: true,
        inReplyToId: true,
        status: true,
        sentiment: true,
        aiDraft: true,
        aiDraftGenerated: true,
        createdAt: true,
        syncedAt: true,
        repliedAt: true,
      },
    });

    const hasMore = items.length > limit;
    const results = items.slice(0, limit);
    const nextCursor = hasMore ? results[results.length - 1]?.createdAt.toISOString() : null;

    // Get unread count
    const unreadCount = await prisma.engagementItem.count({
      where: { workspaceId, status: "UNREAD" },
    });

    log.info("api.inbox.messages.complete", {
      workspaceId,
      count: results.length,
      hasMore,
      unreadCount,
    });

    return NextResponse.json({
      items: results,
      nextCursor,
      unreadCount,
    });
  } catch (err) {
    log.error("api.inbox.messages.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
