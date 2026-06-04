import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { loadBrandContextForAI } from "@/lib/ai/brand-context-loader";
import { buildComposePrompts, buildVariantSystemPrompt, VARIANT_MODIFIERS } from "@/lib/ai/compose-prompt-builder";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import { requirePremium } from "@/lib/api-guards";

const SuggestSchema = z.object({
  prompt: z.string().min(1).max(500),
  platform: z.string().min(1),
});

/** In-memory rate limiter: workspaceId -> array of timestamps */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_RATE_LIMIT_ENTRIES = 1000; // Maximum number of tracked workspaces
const WORKSPACE_INACTIVITY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(workspaceId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(workspaceId) ?? [];
  // Remove expired entries within the window
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  // If workspace has no recent activity and map is full, evict it
  if (valid.length === 0 && rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
    // Find and evict the oldest inactive workspace
    let oldestWorkspace: string | null = null;
    let oldestTime = now;
    for (const [wsId, ts] of rateLimitMap.entries()) {
      const lastActive = ts.length > 0 ? Math.max(...ts) : 0;
      if (now - lastActive > WORKSPACE_INACTIVITY_TTL_MS && lastActive < oldestTime) {
        oldestTime = lastActive;
        oldestWorkspace = wsId;
      }
    }
    if (oldestWorkspace) {
      rateLimitMap.delete(oldestWorkspace);
    }
  }
  
  rateLimitMap.set(workspaceId, valid);
  if (valid.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  valid.push(now);
  return true;
}

/**
 * Cleanup rate limiter entries for inactive workspaces.
 * Called periodically to prevent unbounded memory growth.
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [workspaceId, timestamps] of rateLimitMap.entries()) {
    // Remove entries with no activity in the last 24 hours
    const lastActive = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    if (now - lastActive > WORKSPACE_INACTIVITY_TTL_MS) {
      rateLimitMap.delete(workspaceId);
    }
  }
}

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
    if (!checkRateLimit(workspaceId)) {
      log.warn("api.compose.suggest.rate_limit_exceeded", { workspaceId });
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429, headers: { "Retry-After": "60" } },
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
              if (req.signal.aborted) return;
              
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

            enqueue("variant_done", { variantId, content: sanitized, charCount: sanitized.length });
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
      },
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
