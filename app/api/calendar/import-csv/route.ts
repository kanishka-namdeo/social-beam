import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const VALID_PLATFORMS = [
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "tiktok",
  "pinterest",
  "threads",
  "bluesky",
  "youtube",
];

interface ParsedPost {
  date: string;
  time: string;
  content: string;
  platforms: string[];
  title?: string;
  scheduledAt: string;
}

interface ParseError {
  row: number;
  message: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function validateDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function validateTime(timeStr: string): boolean {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(timeStr)) return false;

  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function validatePlatforms(platformsStr: string): { valid: boolean; platforms: string[] } {
  const platforms = platformsStr
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);

  if (platforms.length === 0) {
    return { valid: false, platforms: [] };
  }

  const invalidPlatforms = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
  if (invalidPlatforms.length > 0) {
    return { valid: false, platforms: [] };
  }

  return { valid: true, platforms };
}

function parseCSV(csv: string): { valid: ParsedPost[]; errors: ParseError[] } {
  const lines = csv.split("\n").filter((line) => line.trim().length > 0);
  const valid: ParsedPost[] = [];
  const errors: ParseError[] = [];

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes("date,") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rowNum = i + 1;
    const line = lines[i];
    const columns = parseCSVLine(line);

    if (columns.length < 4) {
      errors.push({ row: rowNum, message: "Missing required columns" });
      continue;
    }

    const [dateStr, timeStr, content, platformsStr, title] = columns;

    // Validate date
    if (!validateDate(dateStr)) {
      errors.push({ row: rowNum, message: "Invalid or past date" });
      continue;
    }

    // Validate time
    if (!validateTime(timeStr)) {
      errors.push({ row: rowNum, message: "Invalid time format (expected HH:MM)" });
      continue;
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      errors.push({ row: rowNum, message: "Content cannot be empty" });
      continue;
    }

    // Validate platforms
    const platformValidation = validatePlatforms(platformsStr);
    if (!platformValidation.valid) {
      errors.push({
        row: rowNum,
        message: `Invalid platforms. Valid: ${VALID_PLATFORMS.join(", ")}`,
      });
      continue;
    }

    const scheduledAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();

    valid.push({
      date: dateStr,
      time: timeStr,
      content: content.trim(),
      platforms: platformValidation.platforms,
      title: title?.trim() || undefined,
      scheduledAt,
    });
  }

  return { valid, errors };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const workspaceId = (session?.user as any)?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { csv, confirm } = body;

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "CSV text is required" }, { status: 400 });
    }

    const { valid, errors } = parseCSV(csv);

    if (valid.length === 0) {
      return NextResponse.json({ valid: [], errors });
    }

    // If not confirming, just return parsed data
    if (!confirm) {
      return NextResponse.json({ valid, errors });
    }

    // Create posts in transaction
    const createdPosts = await prisma.$transaction(
      valid.map((post) =>
        prisma.post.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId,
            title: post.title || null,
            content: { text: post.content },
            status: "SCHEDULED",
            scheduledAt: new Date(post.scheduledAt),
            PostPlatform: {
              create: post.platforms.map((platform) => ({
                id: crypto.randomUUID(),
                platform,
                content: post.content,
                status: "SCHEDULED",
              })),
            },
          },
        })
      )
    );

    log.info("csv-import.success", { count: createdPosts.length, workspaceId });

    return NextResponse.json({
      valid,
      errors,
      created: createdPosts.length,
    });
  } catch (error) {
    log.error("csv-import.error", { error });
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}
