import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/server-dispatch";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const createNotificationSchema = z.object({
  type: z.enum(["info", "success", "warning", "error"]),
  category: z.enum([
    "post_publish",
    "engagement",
    "system",
    "billing",
    "ai_insight",
    "connection",
    "brand",
    "custom",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  actionUrl: z.string().url().optional(),
  workspaceId: z.string().optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/notifications" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const readFilter = searchParams.get("read");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { userId, dismissed: false };

    if (readFilter === "true") {
      where.read = true;
    } else if (readFilter === "false") {
      where.read = false;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | undefined;
    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem!.id;
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false, dismissed: false },
    });

    log.info("api.request.success", { requestId, count: notifications.length });
    return NextResponse.json(
      { notifications, nextCursor, unreadCount },
      { status: 200 }
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/notifications" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Check rate limit
    const rateLimit = await checkApiRateLimit("POST", "/api/notifications", userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const body = await req.json();
    const parsed = createNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const notification = await createNotification({
      userId,
      ...parsed.data,
    });

    log.info("api.request.success", { requestId, notificationId: notification.id });
    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
