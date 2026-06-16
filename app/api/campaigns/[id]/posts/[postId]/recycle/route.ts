import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requirePremium } from "@/lib/api-guards";
import { createLLM } from "@/lib/ai/model";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";

const recycleSchema = z.object({
  variation: z.enum(["light", "medium", "heavy"]),
});

const VARIATION_INSTRUCTIONS = {
  light: "Make minor rewording adjustments while keeping the same structure, tone, and overall message. Change a few words or phrases but maintain the core content.",
  medium: "Rewrite this content from a different angle while preserving the core message. Use a fresh perspective or approach that would appeal to the same audience.",
  heavy: "Create a completely fresh take on this topic. Keep only the fundamental theme or subject matter, but write entirely new content with a different structure, angle, and approach.",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
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

    const { id: campaignId, postId } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, workspaceId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const parsed = recycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { variation } = parsed.data;

    // Fetch the campaign post and its associated post with platforms
    const campaignPost = await prisma.campaignPost.findUnique({
      where: {
        campaignId_postId: { campaignId, postId },
      },
      include: {
        post: {
          include: {
            PostPlatform: true,
          },
        },
      },
    });

    if (!campaignPost) {
      return NextResponse.json({ error: "Campaign post not found" }, { status: 404 });
    }

    // Verify post is published
    if (campaignPost.post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Only published posts can be recycled" },
        { status: 400 },
      );
    }

    const originalPost = campaignPost.post;
    const originalPlatforms = originalPost.PostPlatform;

    if (originalPlatforms.length === 0) {
      return NextResponse.json(
        { error: "Post has no platform content to recycle" },
        { status: 400 },
      );
    }

    log.info("api.campaigns.posts.recycle.start", {
      campaignId,
      postId,
      variation,
      userId: user.id,
    });

    // Generate variations for each platform
    const llm = createLLM({ temperature: variation === "heavy" ? 0.9 : variation === "medium" ? 0.7 : 0.5 });
    const newPlatforms: Array<{ platform: string; content: string }> = [];

    for (const originalPlatform of originalPlatforms) {
      const charLimit = PLATFORM_CHAR_LIMITS[originalPlatform.platform] ?? null;
      const instruction = VARIATION_INSTRUCTIONS[variation];

      const systemPrompt = `You are a social media content expert. Your task is to create a variation of an existing post.

${instruction}

Requirements:
- Maintain the same general topic/theme
- Keep it appropriate for the ${originalPlatform.platform} platform
${charLimit ? `- Stay within ${charLimit} characters` : ""}
- Output ONLY the new post content, no explanations or metadata`;

      try {
        const response = await llm.invoke([
          { role: "system", content: systemPrompt },
          { role: "user", content: originalPlatform.content },
        ]);

        let content = typeof response.content === "string" ? response.content : String(response.content);
        content = content.trim();

        // Trim if over character limit
        if (charLimit && content.length > charLimit) {
          const shortener = createLLM({ temperature: 0.2 });
          const shortened = await shortener.invoke([
            { role: "system", content: `Shorten this post to fit within ${charLimit} characters while preserving the core message.` },
            { role: "user", content },
          ]);
          content = (typeof shortened.content === "string" ? shortened.content : String(shortened.content)).trim();
        }

        newPlatforms.push({
          platform: originalPlatform.platform,
          content,
        });
      } catch (err) {
        log.error("api.campaigns.posts.recycle.platform_error", {
          postId,
          platform: originalPlatform.platform,
          error: String(err),
        });
        throw err;
      }
    }

    // Create new standalone post (not tied to campaign)
    const newPostId = crypto.randomUUID();
    const newPost = await prisma.post.create({
      data: {
        id: newPostId,
        workspaceId,
        title: null,
        content: newPlatforms[0]?.content ?? "",
        status: "DRAFT",
        aiGenerated: true,
        PostPlatform: {
          create: newPlatforms.map((p) => ({
            id: crypto.randomUUID(),
            platform: p.platform,
            content: p.content,
            status: "DRAFT",
          })),
        },
      },
      include: {
        PostPlatform: true,
      },
    });

    log.info("api.campaigns.posts.recycle.success", {
      campaignId,
      originalPostId: postId,
      newPostId,
      variation,
      userId: user.id,
    });

    return NextResponse.json({
      data: {
        id: newPost.id,
        status: newPost.status,
        aiGenerated: newPost.aiGenerated,
        platforms: newPost.PostPlatform.map((p) => ({
          platform: p.platform,
          content: p.content,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    log.error("api.campaigns.posts.recycle.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
