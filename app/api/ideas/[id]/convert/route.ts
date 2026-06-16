import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";

const ConvertIdeaSchema = z.object({
  scheduledAt: z.string().optional(),
  platforms: z.array(z.string()).min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const { id } = await params;
    log.info("api.ideas.convert.start", { method: "POST", path: `/api/ideas/${id}/convert` });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea || idea.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    if (idea.status === "CONVERTED") {
      return NextResponse.json({ error: "Idea already converted" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = ConvertIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { scheduledAt, platforms } = parsed.data;

    const [post] = await prisma.$transaction([
      prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId,
          title: idea.title,
          content: { text: idea.content || "" } as Prisma.InputJsonValue,
          status: "DRAFT",
          aiGenerated: idea.source === "AI_GENERATED",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          PostPlatform: {
            create: platforms.map((platform) => ({
              id: crypto.randomUUID(),
              platform,
              content: idea.content || "",
              mediaUrls: [],
              status: "DRAFT",
            })),
          },
        },
        include: {
          PostPlatform: true,
        },
      }),
      prisma.idea.update({
        where: { id },
        data: {
          status: "CONVERTED",
        },
      }),
    ]);

    await prisma.idea.update({
      where: { id },
      data: {
        convertedToPostId: post.id,
      },
    });

    log.info("api.ideas.convert.success", { workspaceId, ideaId: id, postId: post.id });

    return NextResponse.json({ postId: post.id });
  } catch (err) {
    log.error("api.ideas.convert.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
