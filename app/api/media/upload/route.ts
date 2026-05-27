import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAGIC_BYTES,
  MIME_TO_EXTENSION,
  WEBP_SIGNATURE,
  AVIF_BRAND,
} from "@/lib/media/constants";
import { processImage } from "@/lib/media/processing";
import { generateStoragePath, storeFile, getPublicUrl } from "@/lib/media/storage";

const uploadResponseSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  width: z.number(),
  height: z.number(),
  publicUrl: z.string(),
  status: z.string(),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

function validateMagicBytes(mimeType: string, buffer: Buffer): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) {
    return false;
  }

  if (mimeType === "image/webp") {
    // RIFF....WEBP — check both RIFF header and WEBP at offset 8
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
    // Check for "ftyp" box at offset 4 and "avif" brand at offset 8
    if (buffer.length < 12) return false;
    const ftyp = new Uint8Array([0x66, 0x74, 0x79, 0x70]); // "ftyp"
    for (let i = 0; i < ftyp.length; i++) {
      if (buffer[4 + i] !== ftyp[i]) return false;
    }
    for (let i = 0; i < AVIF_BRAND.length; i++) {
      if (buffer[8 + i] !== AVIF_BRAND[i]) return false;
    }
    return true;
  }

  // Standard check at offset 0
  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}

function sanitizeFilename(name: string): string {
  // Strip path components, allow only alphanumeric, hyphens, underscores, dots
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
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

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: unknown[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (const file of files) {
      const originalName = sanitizeFilename(file.name);
      const mimeType = file.type;
      const fileSize = file.size;

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        errors.push({ filename: originalName, error: `Unsupported file type: ${mimeType}` });
        continue;
      }

      // Validate file size
      if (fileSize > MAX_FILE_SIZE) {
        errors.push({ filename: originalName, error: "File size exceeds 10MB limit" });
        continue;
      }

      // Convert to buffer
      const rawBuffer = Buffer.from(await file.arrayBuffer());

      // Validate magic bytes
      if (!validateMagicBytes(mimeType, rawBuffer)) {
        errors.push({ filename: originalName, error: "File signature does not match declared type" });
        continue;
      }

      try {
        // Process image for web display
        const processed = await processImage(rawBuffer);

        // Determine extension from processed format
        const ext = MIME_TO_EXTENSION[`image/${processed.format}`] ?? "webp";

        // Generate storage path
        const { storagePath } = generateStoragePath(user.workspaceId, ext);

        // Store processed file
        await storeFile(storagePath, processed.buffer);

        // Create database record
        const asset = await prisma.mediaAsset.create({
          data: {
            workspaceId: user.workspaceId,
            originalName,
            mimeType: `image/${processed.format}`,
            fileSize: processed.buffer.length,
            width: processed.width,
            height: processed.height,
            storagePath,
            publicUrl: getPublicUrl(storagePath, ""),
            status: "active",
            variants: [],
            tags: [],
          },
        });

        results.push(uploadResponseSchema.parse(asset));
      } catch (processError) {
        log.error("media.upload.processError", {
          filename: originalName,
          error: String(processError),
        });
        errors.push({ filename: originalName, error: "Failed to process image" });
      }
    }

    const statusCode = results.length > 0 ? 201 : 400;

    return NextResponse.json(
      {
        data: { uploaded: results, errors },
      },
      { status: statusCode },
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
