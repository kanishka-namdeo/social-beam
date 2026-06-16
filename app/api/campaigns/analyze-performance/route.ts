import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { analyzeCampaignPerformance } from "@/lib/campaign-performance-analysis";

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info("api.campaigns.analyze_performance.start", {
      workspaceId: user.workspaceId,
      userId: user.id,
    });

    // Run the analysis
    const insights = await analyzeCampaignPerformance(user.workspaceId);

    // Update workspace performance memory
    await prisma.workspace.update({
      where: { id: user.workspaceId },
      data: {
        performanceMemory: insights as any,
      },
    });

    log.info("api.campaigns.analyze_performance.success", {
      workspaceId: user.workspaceId,
      campaignCount: insights.campaignCount,
      postCount: insights.postCount,
    });

    return NextResponse.json({
      data: insights,
      message: "Performance analysis complete. Learnings will inform future campaign generation.",
    });
  } catch (error) {
    log.error("api.campaigns.analyze_performance.error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to analyze campaign performance" },
      { status: 500 }
    );
  }
}
