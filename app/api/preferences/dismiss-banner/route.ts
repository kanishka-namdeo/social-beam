import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";

const bannerSchema = z.object({
  banner: z.literal("brand-onboarding"),
});

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const pref = await prisma.dashboardPreference.findUnique({
      where: { workspaceId },
    });

    const layout = (pref?.layout ?? {}) as Record<string, unknown>;
    const dismissedBanners = (layout.dismissedBanners as string[] | undefined) ?? [];
    const dismissed = dismissedBanners.includes("brand-onboarding");

    log.info("api.preferences.dismiss_banner.get", {
      workspaceId,
      dismissed,
    });

    return NextResponse.json({ data: { dismissed } });
  } catch (err) {
    log.error("api.preferences.dismiss_banner.get.error", {
      error: String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const user = session.user as { workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pref = await prisma.dashboardPreference.findUnique({
      where: { workspaceId },
    });

    const existingLayout = (pref?.layout as Record<string, unknown>) ?? {};
    const existingBanners = (existingLayout.dismissedBanners as
      | string[]
      | undefined) ?? [];

    if (!existingBanners.includes("brand-onboarding")) {
      const updatedLayout = {
        ...existingLayout,
        dismissedBanners: [...existingBanners, "brand-onboarding"],
      };

      await prisma.dashboardPreference.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          layout: updatedLayout as Prisma.InputJsonValue,
        },
        update: {
          layout: updatedLayout as Prisma.InputJsonValue,
        },
      });
    }

    log.info("api.preferences.dismiss_banner.post", {
      workspaceId,
      banner: parsed.data.banner,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    log.error("api.preferences.dismiss_banner.post.error", {
      error: String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
