import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  content: z.any(),
  platforms: z.array(z.string()).optional().default([]),
});

const updateTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  content: z.any().optional(),
  platforms: z.array(z.string()).optional(),
  usageCount: z.number().int().nonnegative().optional(),
});

const deleteTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const workspaceId = (session?.user as any)?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: any = { workspaceId };
    if (category) {
      where.category = category;
    }

    const templates = await prisma.postTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = templates.length > limit;
    const data = hasMore ? templates.slice(0, limit) : templates;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    log.error("templates.get.error", { error });
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
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
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, category, content, platforms } = parsed.data;

    const template = await prisma.postTemplate.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId,
        name,
        category,
        content,
        platforms,
      },
    });

    revalidatePath('/dashboard/templates');

    revalidatePath("/dashboard/templates");

    log.info("templates.create.success", { templateId: template.id });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    log.error("templates.create.error", { error });
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const workspaceId = (session?.user as any)?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, name, category, content, platforms, usageCount } = parsed.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (content !== undefined) updateData.content = content;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (usageCount !== undefined) updateData.usageCount = usageCount;

    const template = await prisma.postTemplate.update({
      where: { id, workspaceId },
      data: updateData,
    });

    revalidatePath("/dashboard/templates");

    log.info("templates.update.success", { templateId: template.id });
    return NextResponse.json({ template });
  } catch (error) {
    log.error("templates.update.error", { error });
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const workspaceId = (session?.user as any)?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    await prisma.postTemplate.delete({
      where: { id, workspaceId },
    });

    revalidatePath("/dashboard/templates");

    log.info("templates.delete.success", { templateId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("templates.delete.error", { error });
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
