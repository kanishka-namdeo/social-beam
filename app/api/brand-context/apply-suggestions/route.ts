import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getBrandContext } from "@/lib/db/brand-context";
import { applySuggestion } from "@/lib/brand/learning-signal-aggregator";

const ApplySuggestionSchema = z.object({
  fieldName: z.string().min(1, "fieldName is required"),
  newValue: z.unknown(),
});

// Allowed fields for safety — only fields that can be updated via learning signals
const ALLOWED_FIELDS = [
  "businessName", "tagline", "industry", "productDesc",
  "tonePreset", "voiceDescription", "bannedWords",
  "audienceType", "demographics", "interests", "painPoints",
  "competitors", "goals",
];

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "POST", path: "/api/brand-context/apply-suggestions" });

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
    const parsed = ApplySuggestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { fieldName, newValue } = parsed.data;

    // Safety: only allow known fields
    if (!ALLOWED_FIELDS.includes(fieldName)) {
      return NextResponse.json(
        { error: `Field '${fieldName}' cannot be updated via learning signals` },
        { status: 400 },
      );
    }

    const brandContext = await getBrandContext(workspaceId);
    if (!brandContext) {
      return NextResponse.json({ error: "No brand context configured" }, { status: 400 });
    }

    await applySuggestion(brandContext.id, fieldName, newValue);

    // Fetch updated context to return
    const updatedContext = await getBrandContext(workspaceId);

    log.info("api.request.success", {
      workspaceId,
      brandContextId: brandContext.id,
      fieldName,
    });

    return NextResponse.json({ data: updatedContext });
  } catch (err) {
    logger.error("api.request.error", { path: "/api/brand-context/apply-suggestions", error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
