import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const workspaceId = (session?.user as any)?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postIds, startDate, endDate, frequency } = body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: "postIds must be a non-empty array" }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    if (!frequency) {
      return NextResponse.json({ error: "frequency is required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    // Calculate dates based on frequency
    const dates: Date[] = [];
    let current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));

      if (frequency === "daily") {
        current.setDate(current.getDate() + 1);
      } else if (frequency === "every_other_day") {
        current.setDate(current.getDate() + 2);
      } else if (frequency === "3x_per_week") {
        // Mon, Wed, Fri pattern
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0) {
          current.setDate(current.getDate() + 1); // Sun -> Mon
        } else if (dayOfWeek === 1 || dayOfWeek === 3) {
          current.setDate(current.getDate() + 2); // Mon/Wed -> Wed/Fri
        } else if (dayOfWeek === 5) {
          current.setDate(current.getDate() + 3); // Fri -> Mon
        } else {
          current.setDate(current.getDate() + 1);
        }
      } else if (frequency === "weekly") {
        current.setDate(current.getDate() + 7);
      } else {
        return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
      }
    }

    if (dates.length < postIds.length) {
      return NextResponse.json(
        { error: `Not enough dates for ${postIds.length} posts. Got ${dates.length} dates.` },
        { status: 400 }
      );
    }

    // Update posts in transaction
    const updates = postIds.map((postId: string, index: number) => {
      const scheduledAt = dates[index];
      return prisma.post.update({
        where: { id: postId, workspaceId },
        data: {
          scheduledAt,
          status: "SCHEDULED",
        },
      });
    });

    await prisma.$transaction(updates);

    log.info("bulk-schedule.success", { count: postIds.length, workspaceId });

    return NextResponse.json({
      success: true,
      count: postIds.length,
      dates: dates.map((d) => d.toISOString()),
    });
  } catch (error) {
    log.error("bulk-schedule.error", { error });
    return NextResponse.json(
      { error: "Failed to schedule posts" },
      { status: 500 }
    );
  }
}
