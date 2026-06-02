import type { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const widgetSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
  colSpan: z.number().int().min(1).max(4),
});

const layoutSchema = z.object({
  widgets: z.array(widgetSchema),
});

const DEFAULT_LAYOUT = {
  widgets: [
    { id: "quick-stats", visible: true, colSpan: 4 },
    { id: "recent-posts", visible: true, colSpan: 2 },
    { id: "insights", visible: true, colSpan: 2 },
    { id: "calendar-preview", visible: true, colSpan: 2 },
    { id: "trending-radar", visible: true, colSpan: 2 },
    { id: "engagement-sparkline", visible: true, colSpan: 2 },
    { id: "posting-streak", visible: true, colSpan: 2 },
    { id: "profile-analysis", visible: true, colSpan: 4 },
    { id: "connected-accounts", visible: true, colSpan: 4 },
  ],
};

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/dashboard/preferences" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as Record<string, unknown>).workspaceId as string | undefined;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    let preference = await prisma.dashboardPreference.findUnique({
      where: { workspaceId },
    });

    if (!preference) {
      preference = await prisma.dashboardPreference.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          layout: DEFAULT_LAYOUT as Prisma.InputJsonValue,
        },
      });
    }

    log.info("api.request.success", { requestId });
    return NextResponse.json({ data: preference.layout }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "PUT", path: "/api/dashboard/preferences" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as Record<string, unknown>).workspaceId as string | undefined;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = layoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const preference = await prisma.dashboardPreference.upsert({
      where: { workspaceId },
      create: {
        id: crypto.randomUUID(),
        workspaceId,
        layout: parsed.data as Prisma.InputJsonValue,
      },
      update: {
        layout: parsed.data as Prisma.InputJsonValue,
      },
    });

    log.info("api.request.success", { requestId });
    return NextResponse.json({ data: preference.layout }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
