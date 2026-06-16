import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goal: z.string().max(1000).optional(),
  audience: z.string().max(1000).optional(),
  duration: z.string().max(100).optional(),
  phases: z.array(
    z.object({
      name: z.string(),
      phase: z.enum(["TEASER", "LAUNCH", "SOCIAL_PROOF", "LAST_CALL", "CUSTOM"]),
      order: z.number(),
      description: z.string().optional(),
    }),
  ),
});

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.campaignTemplate.findMany({
      where: {
        OR: [
          { workspaceId: user.workspaceId },
          { isSystem: true },
        ],
      },
      orderBy: [
        { isSystem: "desc" },
        { createdAt: "desc" },
      ],
    });

    log.info("api.campaign-templates.list.success", {
      userId: user.id,
      count: templates.length,
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    log.error("api.campaign-templates.list.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; workspaceId?: string };
    if (!user?.workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, goal, audience, duration, phases } = parsed.data;

    const template = await prisma.campaignTemplate.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: user.workspaceId,
        name,
        description,
        goal,
        audience,
        duration,
        phases,
        isSystem: false,
      },
    });

    log.info("api.campaign-templates.create.success", {
      templateId: template.id,
      userId: user.id,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    log.error("api.campaign-templates.create.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
