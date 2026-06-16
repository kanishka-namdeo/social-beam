import { NextResponse } from "next/server";
import { getFlow } from "@/lib/linkedin/unified-flow";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const flowId = searchParams.get("flowId");

    if (!flowId) {
      return NextResponse.json({ error: "flowId is required" }, { status: 400 });
    }

    const flow = getFlow(flowId);

    if (!flow) {
      return NextResponse.json({
        status: "not_found",
        message: "Flow not found or expired",
      });
    }

    return NextResponse.json({
      status: flow.status,
      error: flow.error,
      cookieExpiry: flow.cookieExpiry,
      platformUserId: flow.platformUserId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get flow status" },
      { status: 500 },
    );
  }
}
