import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/media/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.mediaAsset.findUnique({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    log.info("api.request.success", {
      path: `/api/media/${id}`,
    });

    return NextResponse.json({ data: asset });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.mediaAsset.findUnique({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete file from filesystem
    await deleteFile(asset.storagePath);

    // Delete from database
    await prisma.mediaAsset.delete({
      where: { id },
    });

    log.info("api.request.success", {
      path: `/api/media/${id}`,
      method: "DELETE",
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
