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
import dns from "node:dns";

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

/**
 * Check if an IP address is in a private or reserved range.
 * Blocks access to localhost, internal networks, and cloud metadata endpoints.
 */
function isPrivateIP(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");

  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "0.0.0.0") {
    return true;
  }

  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 127.0.0.0/8 — loopback
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 — private Class A
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 — private Class B
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 — private Class C
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 — link-local (AWS/GCP metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

/**
 * Validate a URL for SSRF safety: only allow http(s) to public hosts.
 */
async function validateUrlForSSRF(url: string): Promise<{ valid: true } | { valid: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL" };
  }

  // Only allow http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "Only http and https schemes are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious hostnames
  if (hostname === "localhost" || hostname === "[::1]") {
    return { valid: false, reason: "Access to localhost is not allowed" };
  }

  // If the hostname is an IP address, check it directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, reason: "Access to private IP addresses is not allowed" };
    }
    return { valid: true };
  }

  // For hostnames, resolve and check each returned address
  // This catches DNS rebinding and hostname->private-IP mappings
  try {
    const address = await dns.promises.lookup(hostname);
    if (isPrivateIP(address.address)) {
      return { valid: false, reason: "Hostname resolves to a private IP address" };
    }
  } catch {
    // DNS resolution failure — fail open with a warning, the fetch will handle it
  }

  return { valid: true };
}

/**
 * After fetching a URL, validate that the final redirected URL is still safe.
 */
function validateFinalUrl(url: string): { valid: true } | { valid: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid redirected URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "Redirected to a non-http(s) URL" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "[::1]") {
    return { valid: false, reason: "Redirected to localhost" };
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateIP(hostname)) {
    return { valid: false, reason: "Redirected to a private IP address" };
  }

  return { valid: true };
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
        // SSRF protection: validate URL before fetching
        const urlValidation = await validateUrlForSSRF(item.url);
        if (!urlValidation.valid) {
          errors.push({ url: item.url, error: `URL rejected: ${urlValidation.reason}` });
          continue;
        }

        // Download file from external URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(item.url, { signal: controller.signal, redirect: "follow" });
        clearTimeout(timeout);

        // SSRF protection: verify the final URL after redirects
        const finalUrlValidation = validateFinalUrl(response.url);
        if (!finalUrlValidation.valid) {
          errors.push({ url: item.url, error: `Redirect blocked: ${finalUrlValidation.reason}` });
          continue;
        }

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
