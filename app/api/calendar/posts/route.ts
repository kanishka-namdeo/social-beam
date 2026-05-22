import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const rescheduleSchema = z.object({
  postId: z.string(),
  newScheduledAt: z.string().datetime(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()), 10);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  log.info("api.calendar.posts.get", { workspaceId, year, month });

  const posts = await prisma.post.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      confidence: true,
      scheduledAt: true,
      publishedAt: true,
      createdAt: true,
      platforms: {
        select: {
          platform: true,
          status: true,
          mediaUrls: true,
        },
      },
    },
  });

  return NextResponse.json({
    posts: posts.map((p) => {
      const content = (p.content as { text?: string; media?: Array<{ type: string; url: string }> }) ?? {};
      return {
        id: p.id,
        title: p.title,
        content: content.text ?? null,
        status: p.status,
        confidence: p.confidence,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        platforms: p.platforms.map((pl) => ({
          platform: pl.platform,
          status: pl.status,
        })),
        media: content.media ?? [],
      };
    }),
  });
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { postId, newScheduledAt } = parsed.data;

  // Verify the post belongs to the user's workspace
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { workspaceId: true, status: true },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existingPost.workspaceId !== workspaceId) {
    log.warn("api.calendar.reschedule.workspace_mismatch", {
      postId,
      postWorkspace: existingPost.workspaceId,
      sessionWorkspace: workspaceId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  log.info("api.calendar.reschedule", {
    workspaceId,
    postId,
    newScheduledAt,
    previousStatus: existingPost.status,
  });

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      scheduledAt: new Date(newScheduledAt),
      status: "SCHEDULED",
    },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      platforms: {
        select: {
          platform: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: {
      ...updatedPost,
      scheduledAt: updatedPost.scheduledAt?.toISOString() ?? null,
      platforms: updatedPost.platforms.map((pl) => ({
        platform: pl.platform,
        status: pl.status,
      })),
    },
  });
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { workspaceId: true },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existingPost.workspaceId !== workspaceId) {
    log.warn("api.calendar.delete.workspace_mismatch", { postId });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  log.info("api.calendar.delete", { workspaceId, postId });

  await prisma.post.delete({ where: { id: postId } });

  return NextResponse.json({ data: { deleted: true } });
}

const duplicateSchema = z.object({ postId: z.string() });

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = duplicateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { postId } = parsed.data;

  const original = await prisma.post.findUnique({
    where: { id: postId },
    include: { platforms: true },
  });

  if (!original) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (original.workspaceId !== workspaceId) {
    log.warn("api.calendar.duplicate.workspace_mismatch", { postId });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  log.info("api.calendar.duplicate", { workspaceId, postId });

  const created = await prisma.post.create({
    data: {
      workspaceId,
      title: original.title ? `Copy of ${original.title}` : "Untitled Copy",
      content: (original.content as unknown) as Prisma.InputJsonValue,
      status: "DRAFT",
      platforms: {
        create: original.platforms.map((p) => ({
          platform: p.platform,
          content: p.content,
          ...(p.mediaUrls != null ? { mediaUrls: p.mediaUrls } : {}),
          status: "DRAFT",
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ data: { id: created.id } });
}
