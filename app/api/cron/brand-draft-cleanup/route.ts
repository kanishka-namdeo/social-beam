import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { runDraftCleanup } from "@/lib/cron/brand-draft-cleanup";
import { acquireCronLock } from "@/lib/cron-lock";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acquire DB-backed advisory lock
  const lock = await acquireCronLock("cron:brand-draft-cleanup");
  if (!lock) {
    logger.info("api.cron.draft_cleanup.already_running");
    return NextResponse.json({ message: "Already in progress" });
  }

  try {
    const deletedCount = await runDraftCleanup();
    return NextResponse.json({ success: true, deletedCount });
  } catch (err) {
    logger.error("api.cron.draft_cleanup.error", { error: String(err) });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  } finally {
    await lock.release();
  }
}
