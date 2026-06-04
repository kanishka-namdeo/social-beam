import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import { requirePremium } from "@/lib/api-guards";

const ModifySchema = z.object({
  content: z.string().min(1).max(10000),
  modifier: z.enum(["shorten", "expand", "casual", "formal"]),
  platform: z.string().min(1),
});

const MODIFIER_PROMPTS: Record<string, string> = {
  shorten: "Rewrite this content to be about 30% shorter. Keep the core message and tone intact. Be concise and punchy.",
  expand: "Expand this content by about 30%. Add relevant details, context, or examples while preserving the original tone and message.",
  casual: "Rewrite this content with a more casual, conversational tone. Relaxed but still professional.",
  formal: "Rewrite this content with a more professional, formal tone. Structured and polished.",
};

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
    log.info("api.compose.modify.start", { method: "POST", path: "/api/compose/modify" });

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
    const parsed = ModifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { content, modifier, platform } = parsed.data;

    log.info("api.compose.modify.invoke", { workspaceId, modifier, platform });

    const charLimit = PLATFORM_CHAR_LIMITS[platform] ?? null;
    const modifierInstruction = MODIFIER_PROMPTS[modifier];

    const encoder = new TextEncoder();

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

        try {
          const selectedModel = modifier === "shorten" ? shortenerModel : model;
          const response = await selectedModel.stream([
            {
              role: "system",
              content: `${modifierInstruction}${charLimit && modifier === "shorten" ? ` Ensure the result is under ${charLimit} characters.` : ""}`,
            },
            { role: "user", content },
          ]);

          let fullContent = "";

          for await (const chunk of response) {
            // Check for client disconnect during streaming
            if (req.signal.aborted) break;
            
            const token = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
            fullContent += token;
            if (!enqueue("content_chunk", { content: fullContent })) break;
          }

          if (req.signal.aborted) {
            log.warn("api.compose.modify.aborted", { modifier, platform });
            controller.close();
            return;
          }

          const sanitized = sanitizeContent(fullContent);

          enqueue("done", { content: sanitized, charCount: sanitized.length });

          log.info("api.compose.modify.complete", {
            workspaceId,
            modifier,
            platform,
            charCount: sanitized.length,
          });
        } catch (err) {
          log.error("api.compose.modify.error", {
            modifier,
            platform,
            error: String(err),
          });
          enqueue("error", { error: "Failed to modify content" });
        } finally {
          controller.close();
        }
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
    log.error("api.compose.modify.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
