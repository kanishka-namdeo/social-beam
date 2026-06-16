import type { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultLayoutForRole, getAllowedSizes, findNearestAllowedSize, SIZE_MAP } from "@/lib/dashboard/widget-registry";

const widgetSchema = z.object({
  i: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(10),
  h: z.number().int().min(1),
  size: z.string().optional(),
  minW: z.number().int().min(1).optional(),
  maxW: z.number().int().max(10).optional(),
  minH: z.number().int().min(1).optional(),
  maxH: z.number().int().optional(),
  static: z.boolean().optional(),
  visible: z.boolean().optional(),
});

const layoutSchema = z.object({
  widgets: z.array(widgetSchema),
});

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
      // Get user role to return role-specific default layout
      const user = await prisma.user.findUnique({
        where: { id: (session.user as Record<string, unknown>).id as string },
        select: { role: true },
      });

      const userRole = user?.role ?? "FREE_USER";
      const defaultLayout = getDefaultLayoutForRole(userRole);

      preference = await prisma.dashboardPreference.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          layout: defaultLayout as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Normalize widget sizes to ensure they're still in the allowed list
    const layout = preference.layout as { widgets?: Array<{ i: string; w: number; h: number; size?: string }> };
    if (layout?.widgets) {
      let needsUpdate = false;
      const normalizedWidgets = layout.widgets.map((widget) => {
        const allowedSizes = getAllowedSizes(widget.i);
        const sizeToken = widget.size || `${widget.w}x${widget.h}`;
        const isValid = allowedSizes.some((s) => s.token === sizeToken);

        if (!isValid) {
          needsUpdate = true;
          const nearest = findNearestAllowedSize({ w: widget.w, h: widget.h }, widget.i);
          if (nearest) {
            return { ...widget, w: nearest.w, h: nearest.h, size: nearest.token };
          }
        }
        return widget;
      });

      if (needsUpdate) {
        const updatedLayout = { ...layout, widgets: normalizedWidgets };
        await prisma.dashboardPreference.update({
          where: { workspaceId },
          data: { layout: updatedLayout as unknown as Prisma.InputJsonValue },
        });
        log.info("api.request.normalized", { requestId, workspaceId });
        return NextResponse.json({ data: updatedLayout }, { status: 200 });
      }
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
