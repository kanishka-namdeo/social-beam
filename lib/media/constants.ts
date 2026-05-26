import type { ResizeOptions } from "sharp";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const STANDARD_POST_SIZE = 1200; // max width for web display
export const MAX_DIMENSION = 10000; // Sharp safety limit

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// Magic bytes for file signature verification
// https://en.wikipedia.org/wiki/List_of_file_signatures
export const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  "image/jpeg": [new Uint8Array([0xff, 0xd8, 0xff])],
  "image/png": [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "image/webp": [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header, need extra check for WEBP
  "image/gif": [new Uint8Array([0x47, 0x49, 0x46, 0x38])], // GIF8
  "image/avif": [new Uint8Array([0x00, 0x00, 0x00])], // ftyp box, need extra check
};

export function magicByteOffset(mimeType: string): number {
  switch (mimeType) {
    case "image/webp":
      return 8; // RIFF....WEBP
    case "image/avif":
      return 4; // skip size bytes, then check "ftyp" + brand
    default:
      return 0;
  }
}

export const WEBP_SIGNATURE = new Uint8Array([0x57, 0x45, 0x42, 0x50]); // "WEBP"
export const AVIF_BRAND = new Uint8Array([0x61, 0x76, 0x69, 0x66]); // "avif"

export interface PlatformSizeSpec {
  width: number;
  height: number;
  aspectRatio: string;
  label: string;
  maxFileSize: number; // bytes
  fit: ResizeOptions["fit"];
}

export interface PlatformDimensionEntry {
  displayName: string;
  sizes: Record<string, PlatformSizeSpec>;
  defaultFormat: "jpeg" | "webp" | "png";
}

export const PLATFORM_DIMENSIONS: Record<string, PlatformDimensionEntry> = {
  instagram: {
    displayName: "Instagram",
    defaultFormat: "jpeg",
    sizes: {
      square: {
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
        label: "Square Post",
        maxFileSize: 30 * 1024 * 1024,
        fit: "cover",
      },
      portrait: {
        width: 1080,
        height: 1350,
        aspectRatio: "4:5",
        label: "Portrait Post",
        maxFileSize: 30 * 1024 * 1024,
        fit: "cover",
      },
      landscape: {
        width: 1080,
        height: 566,
        aspectRatio: "1.91:1",
        label: "Landscape Post",
        maxFileSize: 30 * 1024 * 1024,
        fit: "cover",
      },
      reel: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        label: "Reel Cover",
        maxFileSize: 30 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
  facebook: {
    displayName: "Facebook",
    defaultFormat: "jpeg",
    sizes: {
      post: {
        width: 1200,
        height: 1200,
        aspectRatio: "1:1",
        label: "Post",
        maxFileSize: 4 * 1024 * 1024,
        fit: "cover",
      },
      link: {
        width: 1200,
        height: 630,
        aspectRatio: "1.91:1",
        label: "Link Preview",
        maxFileSize: 4 * 1024 * 1024,
        fit: "cover",
      },
      cover: {
        width: 820,
        height: 312,
        aspectRatio: "2.63:1",
        label: "Cover Photo",
        maxFileSize: 4 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
  x: {
    displayName: "X / Twitter",
    defaultFormat: "jpeg",
    sizes: {
      post: {
        width: 1200,
        height: 675,
        aspectRatio: "16:9",
        label: "Post Image",
        maxFileSize: 5 * 1024 * 1024,
        fit: "cover",
      },
      header: {
        width: 1600,
        height: 900,
        aspectRatio: "16:9",
        label: "Header",
        maxFileSize: 5 * 1024 * 1024,
        fit: "cover",
      },
      avatar: {
        width: 400,
        height: 400,
        aspectRatio: "1:1",
        label: "Avatar",
        maxFileSize: 5 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
  linkedin: {
    displayName: "LinkedIn",
    defaultFormat: "jpeg",
    sizes: {
      post: {
        width: 1200,
        height: 627,
        aspectRatio: "1.91:1",
        label: "Post",
        maxFileSize: 8 * 1024 * 1024,
        fit: "cover",
      },
      cover: {
        width: 1584,
        height: 396,
        aspectRatio: "4:1",
        label: "Cover",
        maxFileSize: 8 * 1024 * 1024,
        fit: "cover",
      },
      logo: {
        width: 300,
        height: 300,
        aspectRatio: "1:1",
        label: "Logo",
        maxFileSize: 8 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
  tiktok: {
    displayName: "TikTok",
    defaultFormat: "jpeg",
    sizes: {
      post: {
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
        label: "Post Image",
        maxFileSize: 10 * 1024 * 1024,
        fit: "cover",
      },
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        label: "Video Cover",
        maxFileSize: 10 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
  pinterest: {
    displayName: "Pinterest",
    defaultFormat: "jpeg",
    sizes: {
      pin: {
        width: 1000,
        height: 1500,
        aspectRatio: "2:3",
        label: "Standard Pin",
        maxFileSize: 20 * 1024 * 1024,
        fit: "cover",
      },
      story: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        label: "Story Pin",
        maxFileSize: 20 * 1024 * 1024,
        fit: "cover",
      },
    },
  },
};
