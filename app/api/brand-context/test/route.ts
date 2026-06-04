import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { loadBrandContextForAI } from "@/lib/ai/brand-context-loader";
import { buildComposePrompts } from "@/lib/ai/compose-prompt-builder";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { requirePremium } from "@/lib/api-guards";

const TestSchema = z.object({
  topic: z.string().min(1).max(2000),
  platforms: z.array(z.string()).min(1).max(6),
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.8,
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  log.info("api.request.start", { method: "POST", path: "/api/brand-context/test" });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; workspaceId?: string };
    const workspaceId = user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const premiumGuard = await requirePremium();
    if (premiumGuard) return premiumGuard;

    const body = await req.json();
    const parsed = TestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { topic, platforms } = parsed.data;

    const brandCtx = await loadBrandContextForAI(workspaceId);
    if (!brandCtx) {
      return NextResponse.json({ error: "No brand context configured" }, { status: 404 });
    }

    const prompts = buildComposePrompts(topic, brandCtx, platforms);

    log.info("api.brand_context.test.start", {
      workspaceId,
      platformCount: platforms.length,
      topic,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (event: string, data: Record<string, unknown>) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          const results: Array<{ platform: string; content: string; charCount: number }> = [];

          for (const p of prompts) {
            enqueue("platform_start", { platform: p.platform });

            try {
              const response = await model.invoke([
                { role: "system", content: p.systemPrompt },
                { role: "user", content: p.userPrompt },
              ]);

              const content = typeof response.content === "string" ? response.content : String(response.content);
              const trimmed = content.trim();

              if (p.charLimit && trimmed.length > p.charLimit) {
                const shortener = new ChatOpenAI({
                  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
                  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
                  modelName: process.env.MODEL ?? "qwen3.6-plus",
                  temperature: 0.2,
                });
                const shortened = await shortener.invoke([
                  { role: "system", content: `Shorten this post to fit within ${p.charLimit} characters while preserving the core message and tone.` },
                  { role: "user", content: trimmed },
                ]);
                const shortenedContent = typeof shortened.content === "string" ? shortened.content.trim() : String(shortened.content).trim();
                results.push({ platform: p.platform, content: shortenedContent, charCount: shortenedContent.length });
              } else {
                results.push({ platform: p.platform, content: trimmed, charCount: trimmed.length });
              }

              enqueue("platform_done", {
                platform: p.platform,
                content: results[results.length - 1].content,
                charCount: results[results.length - 1].charCount,
              });
            } catch (err) {
              log.error("api.brand_context.test.platform_error", {
                platform: p.platform,
                error: String(err),
              });
              enqueue("platform_error", {
                platform: p.platform,
                error: "Failed to generate sample for this platform",
              });
            }
          }

          log.info("api.brand_context.test.complete", {
            workspaceId,
            platformCount: results.length,
          });

          enqueue("complete", { results });
        } catch (err) {
          log.error("api.brand_context.test.stream_error", { error: String(err) });
          enqueue("error", { error: "Generation failed" });
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
    log.error("api.brand_context.test.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
