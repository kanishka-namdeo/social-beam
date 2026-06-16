import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { loadBrandContextForAI } from "@/lib/ai/brand-context-loader";
import { requirePremium } from "@/lib/api-guards";

const DraftSchema = z.object({
  engagementItemId: z.string(),
  tone: z.string().optional(),
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? "",
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.FAST_MODEL ?? process.env.MODEL ?? "qwen3.6-plus",
  temperature: 0.7,
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
    log.info("api.inbox.ai.draft.start", { method: "POST", path: "/api/inbox/ai/draft" });

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
    const parsed = DraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { engagementItemId, tone } = parsed.data;

    const item = await prisma.engagementItem.findUnique({
      where: { id: engagementItemId, workspaceId },
    });
    if (!item) {
      return NextResponse.json({ error: "Engagement item not found" }, { status: 404 });
    }

    const brandCtx = await loadBrandContextForAI(workspaceId);

    // Build reply prompt
    let systemPrompt = `You are replying to a social media engagement on ${item.platform}.
Be concise, authentic, and match the platform's conventions.
Keep responses under 280 characters for X, under 2200 for Instagram.`;

    if (brandCtx) {
      systemPrompt += `\n\nUse this brand voice:\n`;
      if (brandCtx.brandSummary) systemPrompt += `- Summary: ${brandCtx.brandSummary}\n`;
      if (brandCtx.voice?.tonePreset) systemPrompt += `- Tone: ${brandCtx.voice.tonePreset}\n`;
      if (brandCtx.voice?.voiceDescription) systemPrompt += `- Description: ${brandCtx.voice.voiceDescription}\n`;
      if (brandCtx.voice?.bannedWords?.length) systemPrompt += `- Banned words: ${brandCtx.voice.bannedWords.join(", ")}\n`;
    }

    if (tone) {
      systemPrompt += `\nAdjust tone to: ${tone}`;
    }

    const userPrompt = `Context: ${item.parentContent ?? item.content}
${item.type === 'DM' ? 'This is a direct message from the user.' : `User wrote: ${item.content}`}

Generate a reply that addresses their point directly and matches the brand voice.`;

    log.info("api.inbox.ai.draft.prompt_built", {
      workspaceId,
      platform: item.platform,
      hasBrandContext: !!brandCtx,
    });

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
          const response = await model.stream([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ]);

          let fullContent = "";
          for await (const chunk of response) {
            if (req.signal.aborted) break;
            const token = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
            fullContent += token;
            if (!enqueue("content_chunk", { content: fullContent })) break;
          }

          if (req.signal.aborted) {
            controller.close();
            return;
          }

          const sanitized = sanitizeContent(fullContent);

          // Cache the draft with AI-generated flag
          await prisma.engagementItem.update({
            where: { id: engagementItemId },
            data: {
              aiDraft: sanitized,
              aiDraftGenerated: true,
            },
          });

          enqueue("draft_complete", { content: sanitized, aiGenerated: true });
        } catch (err) {
          log.error("api.inbox.ai.draft.failed", { error: String(err) });
          enqueue("draft_error", { error: "Failed to generate draft" });
        }

        controller.close();
      },
      async cancel() {
        // Client disconnected
        log.warn("api.inbox.ai.draft.cancelled_by_client");
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
    log.error("api.inbox.ai.draft.error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
