import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { logCampaignActivity } from "@/lib/campaign-activity";

const approveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
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

    const { id: campaignId, postId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status } = parsed.data;

    const campaignPost = await prisma.campaignPost.findUnique({
      where: {
        campaignId_postId: { campaignId, postId },
      },
      select: { id: true, approvalStatus: true },
    });

    if (!campaignPost) {
      return NextResponse.json({ error: "Campaign post not found" }, { status: 404 });
    }

    const updated = await prisma.campaignPost.update({
      where: {
        campaignId_postId: { campaignId, postId },
      },
      data: {
        approvalStatus: status,
        approvedBy: user.id ?? null,
        approvedAt: new Date(),
      },
    });

    log.info("api.campaigns.posts.approve.success", {
      campaignId,
      postId,
      status,
      userId: user.id,
    });

    if (user.id) {
      await logCampaignActivity(campaignId, user.id, "post_approved", {
        postId,
        status,
        previousStatus: campaignPost.approvalStatus,
      });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    log.error("api.campaigns.posts.approve.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
