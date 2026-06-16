import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Maximum file size for media uploads: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// S3 configuration (optional - falls back to local storage)
const S3_ENABLED = !!(
  process.env.S3_BUCKET &&
  process.env.S3_REGION &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
);

let s3Client: any = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  
  if (!S3_ENABLED) return null;

  try {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: process.env.S3_REGION!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    return s3Client;
  } catch (error) {
    console.error("Failed to initialize S3 client:", error);
    return null;
  }
}

interface StoragePathResult {
  storagePath: string;
  directory: string;
  filename: string;
  publicUrl: string;
}

export function generateStoragePath(workspaceId: string, ext: string): StoragePathResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;
  const directory = path.join(UPLOADS_DIR, workspaceId, String(year), month);
  const storagePath = path.join(directory, filename);
  const publicUrl = `/api/media/file/${workspaceId}/${year}/${month}/${filename}`;

  return { storagePath, directory, filename, publicUrl };
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  if (S3_ENABLED) return; // S3 doesn't need directories
  await fs.mkdir(dirPath, { recursive: true });
}

export function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    throw new Error(
      `File size (${sizeMB}MB) exceeds maximum allowed size of ${maxMB}MB`
    );
  }
}

export async function storeFile(storagePath: string, buffer: Buffer): Promise<void> {
  validateFileSize(buffer);
  const client = await getS3Client();
  
  if (client) {
    // Upload to S3
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const key = storagePath.replace(UPLOADS_DIR + "/", "");
    
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
      })
    );
  } else {
    // Fallback to local storage
    const directory = path.dirname(storagePath);
    await ensureDirectory(directory);
    await fs.writeFile(storagePath, buffer);
  }
}

export async function deleteFile(storagePath: string): Promise<void> {
  const client = await getS3Client();
  
  if (client) {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const key = storagePath.replace(UPLOADS_DIR + "/", "");
      
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        })
      );
    } catch {
      // File may not exist — non-critical for deletion
    }
  } else {
    try {
      await fs.unlink(storagePath);
    } catch {
      // File may not exist — non-critical for deletion
    }
  }
}

export function getPublicUrl(storagePath: string, assetId: string): string {
  return `/api/media/${assetId}/file`;
}
