import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getUserRole, type UserRole, ROLE_HIERARCHY } from "@/lib/role-guard";
import { getWidgetMeta, WIDGET_REGISTRY } from "@/lib/dashboard/widget-registry";

const querySchema = z.object({
  id: z.string().min(1),
  size: z.string().regex(/^\dx\d$/).optional().nullable(),
});

const WIDGET_MIN_ROLES: Record<string, UserRole> = {
  "quick-stats": "FREE_USER",
  "recent-posts": "FREE_USER",
  "insights": "FREE_USER",
  "calendar-preview": "FREE_USER",
  "trending-radar": "FREE_USER",
  "posting-streak": "PREMIUM_USER",
  "profile-analysis": "PREMIUM_USER",
};

function canAccessWidget(widgetId: string, userRole: UserRole): boolean {
  const minRole = WIDGET_MIN_ROLES[widgetId] ?? "FREE_USER";
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/dashboard/widgets" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const queryParams = {
      id: url.searchParams.get("id"),
      size: url.searchParams.get("size"),
    };

    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id: widgetId, size } = parsed.data;

    const meta = getWidgetMeta(widgetId);
    if (!meta) {
      return NextResponse.json(
        { error: "Widget not found" },
        { status: 404 }
      );
    }

    const userRole = await getUserRole();
    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessWidget(widgetId, userRole)) {
      log.warn("api.request.forbidden", { widgetId, userRole });
      return NextResponse.json(
        { error: "Insufficient permissions to access this widget" },
        { status: 403 }
      );
    }

    const body = {
      data: {
        widget: meta,
        size: size ?? meta.defaultSize,
        accessible: true,
      },
    };

    log.info("api.request.success", { requestId, widgetId });
    const response = NextResponse.json(body, { status: 200 });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=30"
    );
    return response;
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
