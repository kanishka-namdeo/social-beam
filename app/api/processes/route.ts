import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import type { ProcessStatus, ActivityType } from "@/app/generated/prisma";

const ACTIVE_STATUSES: ProcessStatus[] = ["QUEUED", "STARTING", "RUNNING", "PAUSED", "STOPPING"];
const RECENT_STATUSES: ProcessStatus[] = ["COMPLETED", "FAILED", "CANCELLED", "ORPHANED"];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") ?? "active";
    const typeParam = url.searchParams.get("type");
    const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId };

    // Status filtering: "active", "recent", "all", or comma-separated list
    if (statusParam === "active") {
      where.status = { in: ACTIVE_STATUSES };
    } else if (statusParam === "recent") {
      where.status = { in: RECENT_STATUSES };
    } else if (statusParam === "all") {
      // no status filter
    } else {
      const statuses = statusParam.split(",").filter(Boolean) as ProcessStatus[];
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Type filtering
    if (typeParam) {
      const types = typeParam.split(",").filter(Boolean) as ActivityType[];
      if (types.length === 1) {
        where.type = types[0];
      } else if (types.length > 1) {
        where.type = { in: types };
      }
    }

    const results = await prisma.scraperProcess.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ processes: results });
  } catch (error) {
    logger.error("api.processes.list.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
