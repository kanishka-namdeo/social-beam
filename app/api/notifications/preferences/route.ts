import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const categoryPreferenceSchema = z.object({
  in_app: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
});

const categoriesSchema = z.record(z.string(), categoryPreferenceSchema);

const updatePreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  categories: categoriesSchema.optional(),
  digestFrequency: z.enum(["NEVER", "DAILY", "WEEKLY"]).optional(),
});

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/notifications/preferences" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    let preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.notificationPreference.create({
        data: {
          id: crypto.randomUUID(),
          userId,
        },
      });
    }

    log.info("api.request.success", { requestId });
    return NextResponse.json({ preferences: preference }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "PUT", path: "/api/notifications/preferences" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        ...parsed.data,
        categories: parsed.data.categories as any ?? undefined,
      },
      update: {
        ...parsed.data,
        categories: parsed.data.categories as any ?? undefined,
      },
    });

    log.info("api.request.success", { requestId });
    return NextResponse.json({ preferences: preference }, { status: 200 });
  } catch (error) {
    log.error("api.request.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
