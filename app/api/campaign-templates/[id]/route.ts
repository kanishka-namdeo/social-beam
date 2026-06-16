import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (!template.isSystem && template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    log.info("api.campaign-templates.get.success", {
      templateId: id,
      userId: user.id,
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    log.error("api.campaign-templates.get.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.campaignTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system templates" },
        { status: 403 },
      );
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.campaignTemplate.delete({ where: { id } });

    log.info("api.campaign-templates.delete.success", {
      templateId: id,
      userId: user.id,
    });

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (error) {
    log.error("api.campaign-templates.delete.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
