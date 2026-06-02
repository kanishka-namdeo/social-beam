import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/media/storage";

const patchSchema = z.object({
  originalName: z.string().min(1).max(255).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

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

export async function PATCH(req: Request, { params }: RouteParams) {
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

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { originalName, tags, status } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (originalName !== undefined) updateData.originalName = originalName;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ data: asset });
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: updateData,
    });

    log.info("api.request.success", {
      path: `/api/media/${id}`,
      method: "PATCH",
      updates: Object.keys(updateData),
    });

    return NextResponse.json({ data: updated });
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
