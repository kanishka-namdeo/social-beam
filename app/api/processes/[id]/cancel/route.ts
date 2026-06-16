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

    const { id } = await params;

    const existing = await prisma.scraperProcess.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 });
    }

    const cancelled = processRegistry.cancel(id);
    if (!cancelled) {
      return NextResponse.json(
        { error: "Process is not running" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Process cancellation requested",
    });
  } catch (error) {
    logger.error("api.processes.cancel.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
