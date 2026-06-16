import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { Workspace: { take: 1, select: { id: true } } },
    });

    if (!user || user.Workspace.length === 0) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const workspaceId = user.Workspace[0].id;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const clusters = await prisma.redditTrendCluster.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    });

    const total = await prisma.redditTrendCluster.count({
      where: { workspaceId },
    });

    logger.info("reddit.clusters.fetched", {
      workspaceId,
      count: clusters.length,
      total,
    });

    return NextResponse.json({
      clusters,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + clusters.length < total,
      },
    });
  } catch (error) {
    logger.error("reddit.clusters.error", { error });
    return NextResponse.json(
      { error: "Failed to fetch trend clusters" },
      { status: 500 }
    );
  }
}
