import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PLATFORM_DIMENSIONS } from "@/lib/media/constants";
import { getPlatformVariant } from "@/lib/media/processing";
import { generateStoragePath, storeFile } from "@/lib/media/storage";

const variantSchema = z.object({
  platform: z.string(),
  sizeType: z.string(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
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
    const parsed = variantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { platform, sizeType } = parsed.data;

    const platformEntry = PLATFORM_DIMENSIONS[platform];
    if (!platformEntry) {
      return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    const sizeSpec = platformEntry.sizes[sizeType];
    if (!sizeSpec) {
      return NextResponse.json(
        { error: `Unknown size type: ${sizeType} for ${platform}` },
        { status: 400 },
      );
    }

    // Read original file
    const originalBuffer = await fs.readFile(asset.storagePath);

    // Generate platform variant
    const variant = await getPlatformVariant(originalBuffer, sizeSpec, platformEntry.defaultFormat);

    // Store variant
    const ext = variant.format === "jpeg" ? "jpg" : variant.format;
    const { storagePath } = generateStoragePath(user.workspaceId, ext);
    await storeFile(storagePath, variant.buffer);

    // Update asset with new variant
    const existingVariants = (asset.variants as Record<string, unknown>[]) ?? [];
    const variantRecord: Record<string, unknown> = {
      platform,
      sizeType,
      width: variant.width,
      height: variant.height,
      format: variant.format,
      storagePath,
      publicUrl: `/api/media/file/${user.workspaceId}/${storagePath.split(user.workspaceId + "/")[1]}`,
    };

    const updatedAsset = await prisma.mediaAsset.update({
      where: { id },
      data: {
        variants: JSON.parse(JSON.stringify([...existingVariants, variantRecord])),
      },
    });

    log.info("api.request.success", {
      path: `/api/media/${id}/variants`,
      platform,
      sizeType,
    });

    return NextResponse.json({ data: { variant: variantRecord, asset: updatedAsset } });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
