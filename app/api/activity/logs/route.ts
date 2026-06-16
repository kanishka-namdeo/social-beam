import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processRegistry } from "@/lib/processes/process-registry";
import { NextResponse } from "next/server";
import type { ActivityType, ActivityStatus } from "@/app/generated/prisma";

interface ActivityLogRecord {
  id: string;
  workspaceId: string;
  type: ActivityType;
  status: ActivityStatus;
  details: Record<string, unknown> | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
}

interface ProcessData {
  progress?: number;
  currentStep?: string | null;
  postsFound?: number;
  postsProcessed?: number;
  processId?: string;
  processStatus?: string;
  hasLiveLogs?: boolean;
  canCancel?: boolean;
}

async function enrichWithProcessData(
  items: ActivityLogRecord[],
  workspaceId: string,
): Promise<(ActivityLogRecord & ProcessData)[]> {
  if (items.length === 0) return [];

  const activityIds = new Set(items.map((i) => i.id));

  const processes = await prisma.scraperProcess.findMany({
    where: { workspaceId },
    select: {
      id: true,
      status: true,
      progress: true,
      currentStep: true,
      postsFound: true,
      postsProcessed: true,
      metadata: true,
    },
  });

  const processByActivityId = new Map<string, (typeof processes)[number]>();
  for (const proc of processes) {
    const meta = proc.metadata as Record<string, unknown> | null;
    const activityLogId = meta?.activityLogId as string | undefined;
    if (activityLogId && activityIds.has(activityLogId)) {
      processByActivityId.set(activityLogId, proc);
    }
  }

  return items.map((item) => {
    const proc = processByActivityId.get(item.id);
    if (!proc) return { ...item };

    const isRunning = proc.status === "RUNNING" || proc.status === "STARTING";
    const registeredProcess = processRegistry.getByProcessId(proc.id);

    return {
      ...item,
      progress: proc.progress,
      currentStep: proc.currentStep,
      postsFound: proc.postsFound,
      postsProcessed: proc.postsProcessed,
      processId: proc.id,
      processStatus: proc.status,
      hasLiveLogs: isRunning,
      canCancel: isRunning && !!registeredProcess,
    };
  });
}

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
    const cursor = url.searchParams.get("cursor");
    const typeParam = url.searchParams.get("type");
    const statusParam = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const includeProcess = url.searchParams.get("include") === "process";
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
    const effectiveLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const usePaginatedMode = !!(cursor || typeParam || statusParam || search || url.searchParams.has("limit"));

    if (usePaginatedMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { workspaceId };

      if (typeParam) {
        const types = typeParam.split(",").filter(Boolean) as ActivityType[];
        if (types.length === 1) {
          where.type = types[0];
        } else if (types.length > 1) {
          where.type = { in: types };
        }
      }

      if (statusParam) {
        const statuses = statusParam.split(",").filter(Boolean) as ActivityStatus[];
        if (statuses.length === 1) {
          where.status = statuses[0];
        } else if (statuses.length > 1) {
          where.status = { in: statuses };
        }
      }

      if (search) {
        where.details = {
          string_contains: search,
        };
      }

      if (cursor) {
        where.createdAt = { lt: new Date(cursor) };
      }

      const [items, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: effectiveLimit + 1,
        }),
        prisma.activityLog.count({ where }),
      ]);

      const hasMore = items.length > effectiveLimit;
      const results = items.slice(0, effectiveLimit);
      const nextCursor = hasMore && results.length > 0
        ? results[results.length - 1].createdAt.toISOString()
        : null;

      const enrichedItems = includeProcess
        ? await enrichWithProcessData(results as ActivityLogRecord[], workspaceId)
        : results;

      return NextResponse.json({
        items: enrichedItems,
        nextCursor,
        hasMore,
        total,
      });
    }

    const [active, recent] = await Promise.all([
      prisma.activityLog.findMany({
        where: { workspaceId, status: "RUNNING" },
        orderBy: { startedAt: "asc" },
      }),
      prisma.activityLog.findMany({
        where: { workspaceId, status: { not: "RUNNING" } },
        orderBy: { createdAt: "desc" },
        take: effectiveLimit,
      }),
    ]);

    if (includeProcess) {
      const allItems = [...active, ...recent] as ActivityLogRecord[];
      const enriched = await enrichWithProcessData(allItems, workspaceId);
      const enrichedMap = new Map(enriched.map((e) => [e.id, e]));
      const enrichedList = (list: ActivityLogRecord[]) =>
        list.map((item) => enrichedMap.get(item.id) ?? item);

      return NextResponse.json({
        active: enrichedList(active as ActivityLogRecord[]),
        recent: enrichedList(recent as ActivityLogRecord[]),
      });
    }

    return NextResponse.json({ active, recent });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
