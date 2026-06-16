import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { loadBrandContextForAI } from "@/lib/ai/brand-context-loader";
import { buildComposePrompts, buildVariantSystemPrompt, VARIANT_MODIFIERS } from "@/lib/ai/compose-prompt-builder";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import { requirePremium } from "@/lib/api-guards";
import { slidingWindowRateLimit } from "@/lib/redis-rate-limiter";

const SuggestSchema = z.object({
  prompt: z.string().min(1).max(500),
  platform: z.string().min(1),
});

// Rate limiter cleanup is handled by Redis sliding window expiry.
// No in-memory cleanup needed since we migrated to Redis-backed rate limiting.


const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.FAST_MODEL ?? process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.8,
});

const shortenerModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.2,
});

/** Strip HTML tags and control characters from LLM output */
function sanitizeContent(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    log.info("api.compose.suggest.start", { method: "POST", path: "/api/compose/suggest" });

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

    const body = await req.json();
    const parsed = SuggestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, platform } = parsed.data;

    // Rate limiting — abuse protection is critical
    const rateLimitResult = await slidingWindowRateLimit(`compose:suggest:${workspaceId}`, 10, 60_000);
    if (!rateLimitResult.allowed) {
      log.warn("api.compose.suggest.rate_limit_exceeded", { workspaceId });
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } },
      );
    }

    const brandCtx = await loadBrandContextForAI(workspaceId);
    const prompts = buildComposePrompts(prompt, brandCtx, [platform]);
    const promptConfig = prompts[0];

    if (!promptConfig) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    log.info("api.compose.suggest.prompt_built", {
      workspaceId,
      platform,
      hasBrandContext: !!brandCtx,
    });

    const encoder = new TextEncoder();

    const variantIds = Object.keys(VARIANT_MODIFIERS).map(Number);
    const charLimit = PLATFORM_CHAR_LIMITS[platform];

    const stream = new ReadableStream({
      async start(controller) {
        try {
        const enqueue = (event: string, data: Record<string, unknown>) => {
          if (req.signal.aborted) return false;
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          try {
            controller.enqueue(encoder.encode(message));
            return true;
          } catch {
            return false;
          }
        };

        // Fire all variants in parallel
        const variantPromises = variantIds.map(async (variantId) => {
          const variantSystemPrompt = buildVariantSystemPrompt(promptConfig.systemPrompt, variantId);

          try {
            const response = await model.stream([
              { role: "system", content: variantSystemPrompt },
              { role: "user", content: promptConfig.userPrompt },
            ]);

            let fullContent = "";

            for await (const chunk of response) {
              // Check for client disconnect during streaming
              if (req.signal.aborted) {
                try { controller.close(); } catch {}
                return;
              }
              
              const token = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
              fullContent += token;

              // Stream incremental updates if under limit
              if (!charLimit || fullContent.length <= charLimit) {
                if (!enqueue("variant_chunk", { variantId, content: fullContent })) return;
              }
            }

            // Abort check before final processing
            if (req.signal.aborted) return;

            let sanitized = sanitizeContent(fullContent);

            // Auto-shorten if exceeds platform character limit
            if (charLimit && sanitized.length > charLimit) {
              try {
                const shortened = await shortenerModel.invoke([
                  {
                    role: "system",
                    content: `Shorten this post to fit within ${charLimit} characters while preserving the core message and tone.`,
                  },
                  { role: "user", content: sanitized },
                ]);
                const shortenedContent = typeof shortened.content === "string" ? shortened.content : String(shortened.content);
                sanitized = sanitizeContent(shortenedContent);
              } catch {
                // Fall through with truncated content
                sanitized = sanitized.slice(0, charLimit).trim();
              }
            }

            enqueue("variant_done", { variantId, content: sanitized, charCount: sanitized.length, aiGenerated: true });
          } catch (err) {
            log.warn("api.compose.suggest.variant_failed", {
              platform,
              variantId,
              error: String(err),
            });
            enqueue("variant_error", { variantId, error: "Failed to generate variant" });
          }
        });

        await Promise.allSettled(variantPromises);

        log.info("api.compose.suggest.complete", {
          workspaceId,
          platform,
          variantCount: variantIds.length,
          hasBrandContext: !!brandCtx,
        });

        controller.close();
        } finally {
          try { controller.close(); } catch {}
        }
      },
      async cancel() {},
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    log.error("api.compose.suggest.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
