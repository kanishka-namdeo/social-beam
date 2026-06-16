import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const notificationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  category: z
    .enum([
      "post_publish",
      "engagement",
      "system",
      "billing",
      "ai_insight",
      "connection",
      "brand",
      "custom",
    ])
    .default("system"),
  timestamp: z.string().optional(),
  read: z.boolean().optional(),
  actionUrl: z.string().optional(),
});

const batchMigrateSchema = z.object({
  notifications: z.array(notificationSchema).max(100),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/notifications/batch-migrate" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Check rate limit (strict: only 1 migration allowed per minute)
    const rateLimit = await checkApiRateLimit("POST", "/api/notifications/batch-migrate", userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Migration already performed recently." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const body = await req.json();
    const parsed = batchMigrateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { notifications } = parsed.data;

    if (notifications.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    // Transform localStorage notifications to database format
    const notificationsToCreate = notifications.map((n) => ({
      userId,
      type: n.type,
      category: n.category,
      title: n.title,
      description: n.description ?? null,
      actionUrl: n.actionUrl ?? null,
      read: n.read ?? false,
      readAt: n.read ? new Date() : null,
      createdAt: n.timestamp ? new Date(n.timestamp) : new Date(),
    }));

    // Use createMany for efficient bulk insert
    const result = await prisma.notification.createMany({
      data: notificationsToCreate,
      skipDuplicates: false,
    });

    log.info("api.request.success", {
      requestId,
      migratedCount: result.count,
    });

    return NextResponse.json(
      { success: true, count: result.count },
      { status: 200 }
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
