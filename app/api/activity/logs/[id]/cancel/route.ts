import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { processRegistry } from "@/lib/processes/process-registry";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 401 });
    }

    const { id: activityLogId } = await params;

    const activityLog = await prisma.activityLog.findFirst({
      where: { id: activityLogId, workspaceId },
    });

    if (!activityLog) {
      return NextResponse.json({ error: "Activity log not found" }, { status: 404 });
    }

    const process = await prisma.scraperProcess.findFirst({
      where: {
        workspaceId,
        metadata: { path: ["activityLogId"], equals: activityLogId },
      },
    });

    if (!process) {
      return NextResponse.json(
        { error: "No associated process found for this activity log" },
        { status: 404 }
      );
    }

    const cancelled = processRegistry.cancel(process.id);
    if (!cancelled) {
      return NextResponse.json(
        { error: "Process is not running or already completed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Process cancellation requested",
      processId: process.id,
    });
  } catch (error) {
    logger.error("POST /api/activity/logs/[id]/cancel error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
