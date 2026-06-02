import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  MAX_FILE_SIZE,
  MAGIC_BYTES,
  MIME_TO_EXTENSION,
  WEBP_SIGNATURE,
  AVIF_BRAND,
} from "@/lib/media/constants";
import { processImage } from "@/lib/media/processing";
import { generateStoragePath, storeFile, getPublicUrl } from "@/lib/media/storage";

const GIF_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for GIFs

const importItemSchema = z.object({
  url: z.string().url(),
  originalName: z.string().max(255),
  mimeType: z.string(),
  attribution: z.object({
    userName: z.string(),
    userUrl: z.string().optional(),
    provider: z.string(),
  }).optional(),
});

const importBodySchema = z.object({
  items: z.array(importItemSchema).min(1).max(20),
});

function validateMagicBytes(mimeType: string, buffer: Buffer): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) {
    return false;
  }

  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const riffSig = signatures[0];
    for (let i = 0; i < riffSig.length; i++) {
      if (buffer[i] !== riffSig[i]) return false;
    }
    for (let i = 0; i < WEBP_SIGNATURE.length; i++) {
      if (buffer[8 + i] !== WEBP_SIGNATURE[i]) return false;
    }
    return true;
  }

  if (mimeType === "image/avif") {
    if (buffer.length < 12) return false;
    const ftyp = new Uint8Array([0x66, 0x74, 0x79, 0x70]);
    for (let i = 0; i < ftyp.length; i++) {
      if (buffer[4 + i] !== ftyp[i]) return false;
    }
    for (let i = 0; i < AVIF_BRAND.length; i++) {
      if (buffer[8 + i] !== AVIF_BRAND[i]) return false;
    }
    return true;
  }

  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

async function isAnimatedGif(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return (metadata.pages ?? 0) > 1;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = importBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { items } = parsed.data;
    const imported: unknown[] = [];
    const errors: { url: string; error: string }[] = [];

    for (const item of items) {
      const originalName = sanitizeFilename(item.originalName);
      const mimeType = item.mimeType;
      const isGif = mimeType === "image/gif";
      const maxSize = isGif ? GIF_MAX_FILE_SIZE : MAX_FILE_SIZE;

      try {
        // Download file from external URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(item.url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
          errors.push({ url: item.url, error: `Download failed: ${response.status} ${response.statusText}` });
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Validate file size
        if (buffer.length > maxSize) {
          errors.push({ url: item.url, error: `File size exceeds ${isGif ? "20MB" : "10MB"} limit` });
          continue;
        }

        // Validate magic bytes
        if (!isGif && !validateMagicBytes(mimeType, buffer)) {
          errors.push({ url: item.url, error: "File signature does not match declared type" });
          continue;
        }

        // For GIFs, check if animated
        let animated = false;
        if (isGif) {
          animated = await isAnimatedGif(buffer);
        }

        let processedBuffer: Buffer;
        let width: number;
        let height: number;
        let format: string;
        let ext: string;

        if (animated) {
          // Store animated GIF as-is without Sharp processing
          processedBuffer = buffer;
          const metadata = await sharp(buffer).metadata();
          width = metadata.width ?? 0;
          height = metadata.height ?? 0;
          format = "gif";
          ext = "gif";
        } else if (isGif) {
          // Static GIF — process through Sharp like other images
          const processed = await processImage(buffer);
          processedBuffer = processed.buffer;
          width = processed.width;
          height = processed.height;
          format = processed.format;
          ext = MIME_TO_EXTENSION[`image/${processed.format}`] ?? "webp";
        } else {
          // Standard image — process through Sharp
          const processed = await processImage(buffer);
          processedBuffer = processed.buffer;
          width = processed.width;
          height = processed.height;
          format = processed.format;
          ext = MIME_TO_EXTENSION[`image/${processed.format}`] ?? "webp";
        }

        // Generate storage path and store
        const { storagePath } = generateStoragePath(user.workspaceId, ext);
        await storeFile(storagePath, processedBuffer);

        // Build tags from attribution info
        const tags: string[] = [];
        if (item.attribution) {
          tags.push(item.attribution.provider);
          if (item.attribution.userName) {
            tags.push(item.attribution.userName);
          }
        }

        // Create database record
        const asset = await prisma.mediaAsset.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId: user.workspaceId,
            originalName,
            mimeType: `image/${format}`,
            fileSize: processedBuffer.length,
            width,
            height,
            storagePath,
            publicUrl: "",
            status: "active",
            variants: [],
            tags,
          },
        });

        // Update with public URL
        const updatedAsset = await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { publicUrl: getPublicUrl(storagePath, asset.id) },
        });

        imported.push({
          id: updatedAsset.id,
          originalName: updatedAsset.originalName,
          mimeType: updatedAsset.mimeType,
          fileSize: updatedAsset.fileSize,
          width: updatedAsset.width,
          height: updatedAsset.height,
          publicUrl: updatedAsset.publicUrl,
          status: updatedAsset.status,
          tags: updatedAsset.tags,
          createdAt: updatedAsset.createdAt,
        });
      } catch (err) {
        log.error("media.import.itemError", {
          url: item.url,
          error: String(err),
        });
        errors.push({ url: item.url, error: err instanceof Error ? err.message : "Import failed" });
      }
    }

    const statusCode = imported.length > 0 ? 201 : 400;

    log.info("api.media.import.complete", {
      total: items.length,
      imported: imported.length,
      errors: errors.length,
    });

    return NextResponse.json(
      { data: { imported, errors } },
      { status: statusCode },
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
