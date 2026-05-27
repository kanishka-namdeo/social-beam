import sharp from "sharp";
import type { ResizeOptions } from "sharp";
import { STANDARD_POST_SIZE, MAX_DIMENSION } from "./constants";

interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

interface VariantSpec {
  width: number;
  height: number;
  fit: ResizeOptions["fit"];
  format: "jpeg" | "webp" | "png";
  quality?: number;
}

export async function extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer, { failOnError: true }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to extract image dimensions");
  }

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new Error(`Image dimensions exceed maximum of ${MAX_DIMENSION}x${MAX_DIMENSION}`);
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format ?? "jpeg",
    size: buffer.length,
  };
}

export async function processImage(
  buffer: Buffer,
  targetWidth: number = STANDARD_POST_SIZE,
): Promise<ProcessedImageResult> {
  const instance = sharp(buffer, { failOnError: true });
  const metadata = await instance.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to extract image dimensions");
  }

  let processed = instance;

  // Resize if image is wider than target
  if (metadata.width > targetWidth) {
    processed = processed.resize(targetWidth, null, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to WebP for efficient web display
  const resultBuffer = await processed.webp({ quality: 85 }).toBuffer();
  const resultMeta = await sharp(resultBuffer).metadata();

  return {
    buffer: resultBuffer,
    width: resultMeta.width ?? 0,
    height: resultMeta.height ?? 0,
    format: "webp",
  };
}

export async function generateVariant(
  buffer: Buffer,
  spec: VariantSpec,
): Promise<ProcessedImageResult> {
  let processed = sharp(buffer, { failOnError: true });

  processed = processed.resize(spec.width, spec.height, {
    fit: spec.fit ?? "cover",
    position: "centre",
  });

  let resultBuffer: Buffer;
  switch (spec.format) {
    case "jpeg":
      resultBuffer = await processed.jpeg({ quality: spec.quality ?? 85 }).toBuffer();
      break;
    case "png":
      resultBuffer = await processed.png().toBuffer();
      break;
    case "webp":
    default:
      resultBuffer = await processed.webp({ quality: spec.quality ?? 85 }).toBuffer();
      break;
  }

  const resultMeta = await sharp(resultBuffer).metadata();

  return {
    buffer: resultBuffer,
    width: resultMeta.width ?? 0,
    height: resultMeta.height ?? 0,
    format: spec.format,
  };
}

export async function getPlatformVariant(
  buffer: Buffer,
  sizeSpec: import("./constants").PlatformSizeSpec,
  format: "jpeg" | "webp" | "png" = "jpeg",
): Promise<ProcessedImageResult> {
  return generateVariant(buffer, {
    width: sizeSpec.width,
    height: sizeSpec.height,
    fit: sizeSpec.fit,
    format,
  });
}
