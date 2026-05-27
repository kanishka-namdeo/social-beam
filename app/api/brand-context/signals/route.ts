import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  signalType: z.string().optional(),
  fieldName: z.string().optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "GET", path: "/api/brand-context/signals" });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const brandContext = await prisma.brandContext.findUnique({
      where: { workspaceId },
      select: { id: true },
    });

    if (!brandContext) {
      return NextResponse.json({ error: "No brand context" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params", details: parsed.error.flatten() }, { status: 400 });
    }

    const { page, limit, signalType, fieldName } = parsed.data;

    const where: Record<string, unknown> = { brandContextId: brandContext.id };
    if (signalType) where.signalType = signalType;
    if (fieldName) where.fieldName = fieldName;

    const [signals, total] = await Promise.all([
      prisma.brandLearningSignal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.brandLearningSignal.count({ where }),
    ]);

    log.info("api.brand_context.signals.success", {
      workspaceId,
      page,
      limit,
      total,
      returned: signals.length,
    });

    return NextResponse.json({
      data: signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    log.error("api.brand_context.signals.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "DELETE", path: "/api/brand-context/signals" });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const brandContext = await prisma.brandContext.findUnique({
      where: { workspaceId },
      select: { id: true },
    });

    if (!brandContext) {
      return NextResponse.json({ error: "No brand context" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const signalId = searchParams.get("id");
    if (!signalId) {
      return NextResponse.json({ error: "Missing signal ID" }, { status: 400 });
    }

    // Verify signal belongs to user's workspace
    const signal = await prisma.brandLearningSignal.findFirst({
      where: { id: signalId, brandContextId: brandContext.id },
    });

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    await prisma.brandLearningSignal.delete({
      where: { id: signalId },
    });

    log.info("api.brand_context.signals.deleted", {
      workspaceId,
      signalId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("api.brand_context.signals.delete_error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
