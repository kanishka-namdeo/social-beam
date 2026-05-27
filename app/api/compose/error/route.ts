import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    logger.error("compose.error_boundary", {
      error: body.error,
      digest: body.digest,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}
