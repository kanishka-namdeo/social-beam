import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.request.start", { method: "GET", path: "/api/credits" });

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    let credits = await prisma.aiCreditBalance.findUnique({
      where: { workspaceId },
    });

    if (!credits) {
      credits = await prisma.aiCreditBalance.create({
        data: { workspaceId, balance: 10 },
      });
    }

    log.info("api.request.success", { balance: credits.balance, tier: credits.tier });
    return NextResponse.json({
      data: {
        balance: credits.balance,
        tier: credits.tier,
        lastRefillAt: credits.lastRefillAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/credits", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
