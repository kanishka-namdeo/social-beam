import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

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
  await fs.mkdir(dirPath, { recursive: true });
}

export async function storeFile(storagePath: string, buffer: Buffer): Promise<void> {
  const directory = path.dirname(storagePath);
  await ensureDirectory(directory);
  await fs.writeFile(storagePath, buffer);
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath);
  } catch {
    // File may not exist — non-critical for deletion
  }
}

export function getPublicUrl(storagePath: string, assetId: string): string {
  return `/api/media/${assetId}/file`;
}
