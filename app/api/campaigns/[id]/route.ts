import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logCampaignActivity } from "@/lib/campaign-activity";
import { createInternalErrorResponse } from "@/lib/error-response";
import { revalidatePath } from "next/cache";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  goal: z.string().max(1000).optional().nullable(),
  audience: z.string().max(1000).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Status transition state machine
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["COMPLETED", "DRAFT", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [], // Terminal state - no transitions out
};

async function validateStatusTransition(
  campaignId: string,
  currentStatus: string,
  newStatus: string,
): Promise<{ valid: boolean; error?: string }> {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
    };
  }

  // DRAFT -> ACTIVE requires at least 1 CampaignPost
  if (currentStatus === "DRAFT" && newStatus === "ACTIVE") {
    const postCount = await prisma.campaignPost.count({
      where: { campaignId },
    });
    if (postCount === 0) {
      return {
        valid: false,
        error: "Cannot activate campaign without posts. Generate posts first.",
      };
    }
  }

  // ACTIVE -> DRAFT only if no posts have been published/scheduled
  if (currentStatus === "ACTIVE" && newStatus === "DRAFT") {
    const publishedOrScheduledCount = await prisma.campaignPost.count({
      where: {
        campaignId,
        post: {
          status: { in: ["PUBLISHED", "SCHEDULED"] },
        },
      },
    });
    if (publishedOrScheduledCount > 0) {
      return {
        valid: false,
        error: "Cannot revert to DRAFT: campaign has published or scheduled posts.",
      };
    }
  }

  return { valid: true };
}

async function getCampaignForUser(campaignId: string, workspaceId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId, workspaceId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { posts: true } },
          posts: {
            include: {
              post: {
                select: {
                  id: true,
                  status: true,
                  scheduledAt: true,
                  PostPlatform: { select: { id: true, platform: true, content: true } },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      _count: { select: { phases: true } },
    },
  });
}

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

    const campaign = await getCampaignForUser(id, user.workspaceId);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    log.info("api.campaigns.get.success", { campaignId: id, userId: user.id });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    log.error("api.campaigns.get.error", { error: String(error) });
    return createInternalErrorResponse(requestId, { operation: "campaigns.get" });
  }
}

export async function PATCH(
  req: Request,
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

    const existing = await prisma.campaign.findUnique({
      where: { id, workspaceId: user.workspaceId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    const { name, description, goal, audience, status, startDate, endDate, duration, metadata } = parsed.data;

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (goal !== undefined) updateData.goal = goal;
    if (audience !== undefined) updateData.audience = audience;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (duration !== undefined) updateData.duration = duration;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Status state machine validation
    let currentCampaign: { status: string } | null = null;
    if (status !== undefined) {
      currentCampaign = await prisma.campaign.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!currentCampaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const transition = await validateStatusTransition(id, currentCampaign.status, status);
      if (!transition.valid) {
        return NextResponse.json(
          { error: transition.error },
          { status: 400 },
        );
      }

      updateData.status = status;
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: { _count: { select: { posts: true } } },
        },
      },
    });

    revalidatePath("/dashboard/campaigns");

    log.info("api.campaigns.update.success", { campaignId: id, userId: user.id });

    if (user.id) {
      if (status !== undefined) {
        await logCampaignActivity(id, user.id, "status_changed", {
          fromStatus: currentCampaign?.status,
          toStatus: status,
        });
      } else {
        await logCampaignActivity(id, user.id, "updated", {
          updatedFields: Object.keys(updateData),
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    log.error("api.campaigns.update.error", { error: String(error) });
    return createInternalErrorResponse(requestId, { operation: "campaigns.update" });
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

    const existing = await prisma.campaign.findUnique({
      where: { id, workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Wrap cascade deletion + activity log in a single transaction for atomicity
    await prisma.$transaction(async (tx) => {
      await tx.campaignPost.deleteMany({ where: { campaignId: id } });
      await tx.campaign.delete({ where: { id } });
      if (user.id) {
        try {
          await tx.campaignActivity.create({
            data: {
              id: crypto.randomUUID(),
              campaignId: id,
              userId: user.id,
              action: "deleted",
              details: { campaignName: existing.name } as any,
            },
          });
        } catch (err) {
          // Don't fail deletion if activity log fails
          logger.warn("api.campaigns.delete.activity_log_failed", {
            campaignId: id,
            userId: user.id,
            error: String(err),
          });
        }
      }
    });

    revalidatePath("/dashboard/campaigns");

    log.info("api.campaigns.delete.success", { campaignId: id, userId: user.id });

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (error) {
    log.error("api.campaigns.delete.error", { error: String(error) });
    return createInternalErrorResponse(requestId, { operation: "campaigns.delete" });
  }
}
