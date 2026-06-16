import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.calendar.ideas.start", { method: "GET", path: "/api/calendar/ideas" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || new Date().getMonth().toString());

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const ideas = await prisma.idea.findMany({
      where: {
        workspaceId,
        targetDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["NEW", "PLACED"],
        },
      },
      orderBy: {
        targetDate: "asc",
      },
    });

    log.info("api.calendar.ideas.success", { workspaceId, year, month, count: ideas.length });

    return NextResponse.json({ ideas });
  } catch (err) {
    log.error("api.calendar.ideas.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
