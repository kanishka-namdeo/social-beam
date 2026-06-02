import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const bulkStatusSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(["active", "archived"]),
});

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bulkStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ids, status } = parsed.data;

    await prisma.mediaAsset.updateMany({
      where: {
        id: { in: ids },
        workspaceId: user.workspaceId,
      },
      data: { status },
    });

    log.info("api.request.success", {
      path: "/api/media/bulk-status",
      method: "PATCH",
      count: ids.length,
      status,
    });

    return NextResponse.json({ data: { updated: ids.length } });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
