import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandContext } from "@/lib/db/brand-context";
import { extractLearningSignals, persistLearningSignals } from "@/lib/brand/learning-extractor";

const LearnRequestSchema = z.object({
  originalContent: z.string().min(1, "originalContent is required"),
  editedContent: z.string().min(1, "editedContent is required"),
  platform: z.string().min(1, "platform is required"),
  postId: z.string().optional(),
  signalType: z.enum(["post_edit_diff", "thumbs_up", "thumbs_down", "user_feedback"]).default("post_edit_diff"),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "POST", path: "/api/brand-context/learn" });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = LearnRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { originalContent, editedContent, platform, postId, signalType } = parsed.data;

    // Get brand context ID for this workspace
    const brandContext = await getBrandContext(workspaceId);
    if (!brandContext) {
      log.info("api.request.success", { workspaceId, reason: "no_brand_context" });
      return NextResponse.json({ data: { extracted: 0, reason: "No brand context configured" } });
    }

    // Extract signals from the diff
    const signals = await extractLearningSignals({
      originalContent,
      editedContent,
      platform,
    });

    if (signals.length === 0) {
      log.info("api.request.success", { workspaceId, extracted: 0, reason: "no_signals" });
      return NextResponse.json({ data: { extracted: 0, reason: "No meaningful learning signals detected" } });
    }

    // Persist signals
    const persistedCount = await persistLearningSignals({
      brandContextId: brandContext.id,
      signals,
      signalType,
      sourcePostId: postId,
    });

    log.info("api.request.success", {
      workspaceId,
      brandContextId: brandContext.id,
      extracted: signals.length,
      persisted: persistedCount,
      platform,
    });

    return NextResponse.json({
      data: {
        extracted: signals.length,
        persisted: persistedCount,
        signals: signals.map((s) => ({
          fieldName: s.fieldName,
          direction: s.direction,
          confidence: s.confidence,
        })),
      },
    });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/learn", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
