import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  keywords: z.array(z.string().min(1)).min(1).max(20),
  subreddits: z.array(z.string().min(1)).max(10).optional().default([]),
  minScore: z.number().min(0).max(1000).optional().default(50),
  minIntent: z.number().min(0).max(100).optional(),
  notifyOn: z.array(z.enum(["high_relevance", "high_intent", "brand_mention", "competitor_mention"])).min(1),
  enabled: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/alerts" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const alerts = await prisma.redditAlert.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = alerts.length > limit;
    const data = hasMore ? alerts.slice(0, limit) : alerts;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    log.info("api.request.success", { requestId, alertCount: data.length });
    return NextResponse.json({ data, nextCursor }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/alerts" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const alert = await prisma.redditAlert.create({
      data: {
        workspaceId,
        ...parsed.data,
      },
    });

    revalidatePath("/reddit/trending");

    log.info("api.request.success", { requestId, alertId: alert.id });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
