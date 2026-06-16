import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const patchNotificationSchema = z.object({
  read: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const { id } = await params;
    log.info("api.request.start", { method: "PATCH", path: `/api/notifications/${id}` });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const parsed = patchNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.read !== undefined) {
      updateData.read = parsed.data.read;
      updateData.readAt = parsed.data.read ? new Date() : null;
    }
    if (parsed.data.dismissed !== undefined) {
      updateData.dismissed = parsed.data.dismissed;
      updateData.dismissedAt = parsed.data.dismissed ? new Date() : null;
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/notifications");

    log.info("api.request.success", { requestId, notificationId: id });
    return NextResponse.json({ notification }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const { id } = await params;
    log.info("api.request.start", { method: "DELETE", path: `/api/notifications/${id}` });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id } });

    revalidatePath("/notifications");

    log.info("api.request.success", { requestId, notificationId: id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
