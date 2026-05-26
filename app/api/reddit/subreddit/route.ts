import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { AddSubredditSchema } from "@/lib/reddit/validation";

export async function GET() {
  const log = logger.child({ requestId: crypto.randomUUID() });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/reddit/subreddit" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const configs = await prisma.redditSubredditConfig.findMany({
      where: { workspaceId },
      orderBy: [{ isActive: "desc" }, { subreddit: "asc" }],
    });

    log.info("api.request.success", { count: configs.length });
    return NextResponse.json({ data: configs });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/reddit/subreddit", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "POST", path: "/api/reddit/subreddit" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = AddSubredditSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subreddit, sortOrder } = parsed.data;
    const normalized = subreddit.toLowerCase().replace(/^r\//, "");

    try {
      const config = await prisma.redditSubredditConfig.create({
        data: { workspaceId, subreddit: normalized, sortOrder },
      });
      log.info("api.request.success", { subreddit: normalized });
      return NextResponse.json({ data: config }, { status: 201 });
    } catch (dbErr: unknown) {
      if (
        typeof dbErr === "object" &&
        dbErr !== null &&
        "code" in dbErr &&
        (dbErr as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: `r/${normalized} is already being tracked` },
          { status: 409 }
        );
      }
      throw dbErr;
    }
  } catch (err) {
    logger.error("api.request.error", { path: "/api/reddit/subreddit", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "PATCH", path: "/api/reddit/subreddit" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const schema = z.object({
      id: z.string(),
      isActive: z.boolean().optional(),
      sortOrder: z.enum(["hot", "rising", "new"]).optional(),
    });
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, isActive, sortOrder } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const config = await prisma.redditSubredditConfig.update({
      where: { id, workspaceId },
      data: updateData,
    });

    log.info("api.request.success", { configId: id });
    return NextResponse.json({ data: config });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/reddit/subreddit", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "DELETE", path: "/api/reddit/subreddit" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await prisma.redditSubredditConfig.delete({
      where: { id, workspaceId },
    });

    log.info("api.request.success", { configId: id });
    return NextResponse.json({ data: { message: "Subreddit removed" } });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/reddit/subreddit", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
