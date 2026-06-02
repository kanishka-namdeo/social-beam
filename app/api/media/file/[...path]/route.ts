import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ path: string[] }>;
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

    const { path: pathSegments } = await params;

    if (pathSegments.length < 4) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Path format: [workspaceId, year, month, filename]
    const [workspaceId, year, month, filename] = pathSegments;

    if (workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the asset by matching the publicUrl pattern
    const expectedPublicUrl = `/api/media/file/${pathSegments.join("/")}`;
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        workspaceId: user.workspaceId,
        publicUrl: expectedPublicUrl,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check if file exists
    try {
      await fs.access(asset.storagePath);
    } catch {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(asset.storagePath);

    // Determine content type
    const contentType = asset.mimeType ?? "application/octet-stream";

    log.info("api.request.success", {
      path: `/api/media/file/${pathSegments.join("/")}`,
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
