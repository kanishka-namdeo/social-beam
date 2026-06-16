import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const batchActionSchema = z.object({
  action: z.enum(["read", "dismiss", "delete"]),
  notificationIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "PATCH", path: "/api/notifications/batch" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Check rate limit
    const rateLimit = await checkApiRateLimit("POST", "/api/notifications/batch", userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const body = await req.json();
    const parsed = batchActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, notificationIds } = parsed.data;

    if (action === "delete" && (!notificationIds || notificationIds.length === 0)) {
      return NextResponse.json(
        { error: "Must specify notificationIds for delete action" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };
    if (notificationIds && notificationIds.length > 0) {
      where.id = { in: notificationIds };
    }

    let result;
    if (action === "read") {
      result = await prisma.notification.updateMany({
        where,
        data: { read: true, readAt: new Date() },
      });
    } else if (action === "dismiss") {
      result = await prisma.notification.updateMany({
        where,
        data: { dismissed: true, dismissedAt: new Date() },
      });
    } else {
      result = await prisma.notification.deleteMany({ where });
    }

    log.info("api.request.success", { requestId, action, count: result.count });
    return NextResponse.json({ success: true, count: result.count }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
