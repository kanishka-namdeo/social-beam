import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PLATFORMS } from "@/lib/oauth/platform-icons";

const composeSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, "Content is required").max(63206),
  platforms: z
    .array(z.enum(PLATFORMS))
    .min(1, "At least one platform is required"),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    log.info("api.request.start", {
      method: "POST",
      path: "/api/compose",
      userId: user.id,
    });

    // Verify connected accounts for requested platforms
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        workspaceId: user.workspaceId,
        platform: { in: PLATFORMS as unknown as string[] },
        status: "connected",
      },
      select: { platform: true },
    });
    const connectedPlatformSet = new Set(connectedAccounts.map((a) => a.platform));

    const body = await req.json();
    const parsed = composeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, content, platforms, scheduledAt } = parsed.data;

    // Validate all requested platforms are connected
    const unconnected = platforms.filter((p) => !connectedPlatformSet.has(p));
    if (unconnected.length > 0) {
      return NextResponse.json(
        {
          error: "Platforms not connected",
          platforms: unconnected,
        },
        { status: 400 },
      );
    }

    const status = scheduledAt != null ? "SCHEDULED" : "DRAFT";

    const post = await prisma.post.create({
      data: {
        workspaceId: user.workspaceId,
        title,
        content: { text: content } as Prisma.InputJsonValue,
        status,
        scheduledAt: scheduledAt != null ? new Date(scheduledAt) : null,
        platforms: {
          create: platforms.map((platform) => ({
            platform,
            content,
            mediaUrls: [],
            status,
          })),
        },
      },
      include: {
        platforms: { select: { id: true, platform: true } },
      },
    });

    log.info("api.request.success", {
      postId: post.id,
      status,
      platformCount: platforms.length,
    });

    return NextResponse.json(
      {
        data: {
          id: post.id,
          title: post.title,
          status: post.status,
          scheduledAt: post.scheduledAt,
          platforms: (post as { platforms?: Array<{ id: string; platform: string }> }).platforms?.map((p: { id: string; platform: string }) => ({
            id: p.id,
            platform: p.platform,
          })) ?? [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
