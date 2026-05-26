import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/media/storage";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const take = Math.min(parseInt(url.searchParams.get("take") ?? "24", 10), 100);
    const skip = parseInt(url.searchParams.get("skip") ?? "0", 10);
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "active";

    const whereClause: Record<string, unknown> = {
      workspaceId: user.workspaceId,
      status,
    };

    if (search) {
      whereClause.OR = [
        { originalName: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          width: true,
          height: true,
          publicUrl: true,
          status: true,
          tags: true,
          createdAt: true,
        },
      }),
      prisma.mediaAsset.count({ where: whereClause }),
    ]);

    log.info("api.request.success", {
      path: "/api/media",
      total,
      returned: assets.length,
    });

    return NextResponse.json({
      data: {
        assets,
        total,
        hasMore: skip + assets.length < total,
      },
    });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const ids = body.ids as string[] | undefined;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Fetch assets to get storage paths
    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: ids },
        workspaceId: user.workspaceId,
      },
      select: { id: true, storagePath: true },
    });

    // Delete files from filesystem
    await Promise.all(assets.map((asset) => deleteFile(asset.storagePath)));

    // Delete from database
    const result = await prisma.mediaAsset.deleteMany({
      where: {
        id: { in: ids },
        workspaceId: user.workspaceId,
      },
    });

    log.info("api.request.success", {
      path: "/api/media",
      method: "DELETE",
      deletedCount: result.count,
    });

    return NextResponse.json({ data: { deletedCount: result.count } });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
