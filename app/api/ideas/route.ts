import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  source: z.enum(["MANUAL", "AI_GENERATED", "RSS", "TRENDING"]).default("MANUAL"),
  trendSource: z.any().optional(),
  targetDate: z.string().optional(),
});

const UpdateIdeaSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["NEW", "PLACED", "CONVERTED", "DISMISSED"]).optional(),
  convertedToPostId: z.string().optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.ideas.list.start", { method: "GET", path: "/api/ideas" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: any = { workspaceId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (source) where.source = source;

    const ideas = await prisma.idea.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = ideas.length > limit;
    const data = hasMore ? ideas.slice(0, limit) : ideas;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    log.info("api.ideas.list.success", { workspaceId, count: data.length });

    return NextResponse.json({
      data,
      nextCursor,
    });
  } catch (err) {
    log.error("api.ideas.list.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.ideas.create.start", { method: "POST", path: "/api/ideas" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CreateIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, category, source, trendSource, targetDate } = parsed.data;

    const idea = await prisma.idea.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        title,
        content,
        category,
        source,
        trendSource,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: "NEW",
      },
    });

    revalidatePath("/dashboard/ideas");

    log.info("api.ideas.create.success", { workspaceId, ideaId: idea.id, title });

    return NextResponse.json(idea, { status: 201 });
  } catch (err) {
    log.error("api.ideas.create.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.ideas.update.start", { method: "PATCH", path: "/api/ideas" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const existing = await prisma.idea.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const idea = await prisma.idea.update({
      where: { id },
      data: {
        ...updateData,
        targetDate: updateData.targetDate ? new Date(updateData.targetDate) : undefined,
      },
    });

    revalidatePath("/dashboard/ideas");

    log.info("api.ideas.update.success", { workspaceId, ideaId: idea.id });

    return NextResponse.json(idea);
  } catch (err) {
    log.error("api.ideas.update.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.ideas.delete.start", { method: "DELETE", path: "/api/ideas" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.idea.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    await prisma.idea.delete({ where: { id } });

    revalidatePath("/dashboard/ideas");

    log.info("api.ideas.delete.success", { workspaceId, ideaId: id });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("api.ideas.delete.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
