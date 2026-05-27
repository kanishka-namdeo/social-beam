import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandContext, deleteBrandContext, upsertBrandContext } from "@/lib/db/brand-context";

const PatchBrandContextSchema = z.object({
  businessName: z.string().optional(),
  tagline: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  industry: z.string().optional(),
  productDesc: z.string().optional(),
  tonePreset: z.string().optional(),
  voiceDescription: z.string().optional(),
  bannedWords: z.array(z.string()).optional(),
  audienceType: z.string().optional(),
  demographics: z.unknown().optional(),
  interests: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "PATCH", path: "/api/brand-context" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = PatchBrandContextSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getBrandContext(workspaceId);
    if (!existing) {
      return NextResponse.json({ error: "No brand context to update" }, { status: 404 });
    }

    const updated = await upsertBrandContext(workspaceId, parsed.data);

    log.info("api.request.success", { workspaceId, action: "patch" });
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/brand-context" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const context = await getBrandContext(workspaceId);

    if (!context) {
      log.info("api.request.success", { workspaceId, found: false });
      return NextResponse.json({ data: null });
    }

    log.info("api.request.success", {
      workspaceId,
      found: true,
      trainingStatus: context.trainingStatus,
      platformCount: context.platformContexts?.length ?? 0,
    });
    return NextResponse.json({ data: context });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "DELETE", path: "/api/brand-context" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    await deleteBrandContext(workspaceId);

    log.info("api.request.success", { workspaceId, action: "delete" });
    return NextResponse.json({ data: { message: "Brand context deleted" } });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
