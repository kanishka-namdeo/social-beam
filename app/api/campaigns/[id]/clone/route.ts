import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { logCampaignActivity } from "@/lib/campaign-activity";
import type { Prisma } from "@/app/generated/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premiumError = await requirePremium();
    if (premiumError) return premiumError;

    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { id: campaignId } = await params;

    const original = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        phases: { orderBy: { order: "asc" } },
        posts: {
          include: {
            post: {
              include: {
                PostPlatform: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const newCampaignId = crypto.randomUUID();

    const clonedCampaign = await prisma.campaign.create({
      data: {
        id: newCampaignId,
        workspaceId,
        name: `${original.name} (Copy)`,
        description: original.description,
        goal: original.goal,
        audience: original.audience,
        status: "DRAFT",
        startDate: null,
        endDate: null,
        duration: original.duration,
        metadata: (original.metadata ?? {}) as Prisma.InputJsonValue,
        phases: {
          create: original.phases.map((phase) => ({
            id: crypto.randomUUID(),
            name: phase.name,
            phase: phase.phase,
            order: phase.order,
            description: phase.description,
            scheduledAt: null,
          })),
        },
      },
      include: {
        phases: { orderBy: { order: "asc" } },
      },
    });

    const phaseIdMap = new Map<string, string>();
    original.phases.forEach((phase, index) => {
      phaseIdMap.set(phase.id, clonedCampaign.phases[index].id);
    });

    for (const cp of original.posts) {
      const newPostId = crypto.randomUUID();
      const newCampaignPostId = crypto.randomUUID();
      const newPhaseId = cp.phaseId ? phaseIdMap.get(cp.phaseId) : null;

      await prisma.post.create({
        data: {
          id: newPostId,
          workspaceId,
          content: cp.post.content as Prisma.InputJsonValue,
          status: "DRAFT",
          aiGenerated: cp.post.aiGenerated,
          CampaignPost: {
            create: {
              id: newCampaignPostId,
              campaignId: newCampaignId,
              phaseId: newPhaseId,
              order: cp.order,
              notes: cp.notes,
            },
          },
          PostPlatform: {
            create: cp.post.PostPlatform.map((pp) => ({
              id: crypto.randomUUID(),
              platform: pp.platform,
              content: pp.content,
              status: "DRAFT",
              mediaUrls: (pp.mediaUrls ?? []) as Prisma.InputJsonValue,
            })),
          },
        },
      });
    }

    if (user.id) {
      await logCampaignActivity(newCampaignId, user.id, "cloned", {
        originalCampaignId: campaignId,
        originalCampaignName: original.name,
      });
    }

    log.info("api.campaigns.clone.success", {
      originalCampaignId: campaignId,
      newCampaignId,
      userId: user.id,
    });

    return NextResponse.json({ data: clonedCampaign }, { status: 201 });
  } catch (error) {
    log.error("api.campaigns.clone.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
