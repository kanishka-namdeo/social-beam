import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { generateCampaignPlan, loadCampaignBrandContext, type CampaignBrief } from "@/lib/ai/campaign-generator";
import { logCampaignActivity } from "@/lib/campaign-activity";
import { checkIdempotencyKey, storeIdempotencyKey, getIdempotencyKey } from "@/lib/idempotency";

const listQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goal: z.string().max(1000).optional(),
  audience: z.string().max(1000).optional(),
  duration: z.string().max(100).optional(),
  platforms: z.array(z.string()).min(1).optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? 20,
      offset: searchParams.get("offset") ?? 0,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, limit, offset } = parsed.data;

    const where: Record<string, unknown> = { workspaceId: user.workspaceId };
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          phases: {
            select: {
              id: true,
              name: true,
              phase: true,
              order: true,
              _count: { select: { posts: true } },
            },
            orderBy: { order: "asc" },
          },
          _count: { select: { phases: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.campaign.count({ where }),
    ]);

    log.info("api.campaigns.list.success", {
      userId: user.id,
      total,
      limit,
      offset,
    });

    return NextResponse.json({
      data: campaigns,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    const log = logger.child({ requestId: crypto.randomUUID() });
    log.error("api.campaigns.list.error", { error: String(error) });
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

    const premiumError = await requirePremium();
    if (premiumError) return premiumError;

    const user = session.user as { id?: string; workspaceId?: string; role?: string };
    if (!user?.workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Check idempotency key
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey && user.id) {
      const cached = await checkIdempotencyKey(idempotencyKey, user.id);
      if (cached) {
        log.info("api.campaigns.create.idempotency.hit", { idempotencyKey });
        return NextResponse.json(cached.response, { status: 200 });
      }
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, goal, audience, duration, platforms } = parsed.data;

    log.info("api.campaigns.create.start", {
      userId: user.id,
      workspaceId: user.workspaceId,
      name,
      hasPlatforms: !!platforms,
    });

    const brief: CampaignBrief = { name, description, goal, audience, duration };
    const brandCtx = await loadCampaignBrandContext(user.workspaceId);
    const phases = await generateCampaignPlan(brief, brandCtx, user.workspaceId);

    const campaign = await prisma.campaign.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: user.workspaceId,
        name,
        description,
        goal,
        audience,
        duration,
        phases: {
          create: phases.map((p) => ({
            id: crypto.randomUUID(),
            name: p.name,
            phase: p.phase,
            order: p.order,
            description: p.description,
          })),
        },
      },
      include: {
        phases: {
          orderBy: { order: "asc" },
        },
      },
    });

    log.info("api.campaigns.create.success", {
      campaignId: campaign.id,
      phaseCount: phases.length,
    });

    if (user.id) {
      await logCampaignActivity(campaign.id, user.id, "created", {
        phaseCount: phases.length,
        name,
      });
    }

    // Store idempotency key if provided
    if (idempotencyKey && user.id) {
      await storeIdempotencyKey(idempotencyKey, user.id, { data: campaign });
    }

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    log.error("api.campaigns.create.error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
