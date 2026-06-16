import { createLLM, createFastLLM } from "@/lib/ai/model";
import { loadBrandContextForAI, type BrandContextForAI } from "@/lib/ai/brand-context-loader";
import { buildComposePrompts } from "@/lib/ai/compose-prompt-builder";
import {
  buildCampaignPlanPrompt,
  buildPhasePostSystemPrompt,
  buildPhasePostUserPrompt,
  loadPerformanceContext,
  buildTrendContext,
  type CampaignPhaseType,
} from "@/lib/ai/campaign-prompts";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { fetchTrendingContext } from "@/lib/campaign-trends";
import type { PerformanceInsights } from "@/lib/campaign-performance-analysis";

export interface CampaignBrief {
  name: string;
  description?: string;
  goal?: string;
  audience?: string;
  duration?: string;
}

export interface GeneratedPhase {
  name: string;
  phase: CampaignPhaseType;
  order: number;
  description: string;
}

export interface GeneratedPost {
  platform: string;
  content: string;
  charCount: number;
}

export interface QualityBreakdown {
  overall: number;
  hook: number;
  platformFit: number;
  brandAlignment: number;
  engagementPotential: number;
}

export interface GeneratedVariant extends GeneratedPost {
  variantIndex: number;
  qualityScore: number;
  qualityBreakdown: QualityBreakdown;
}

export async function generateCampaignPlan(
  brief: CampaignBrief,
  brandCtx: BrandContextForAI | null,
  workspaceId?: string,
): Promise<GeneratedPhase[]> {
  const llm = createFastLLM({ temperature: 0.5 });

  // Fetch performance and trend context if workspaceId provided
  let performanceContext = "";
  let trendContext = "";

  if (workspaceId) {
    try {
      // Load performance memory from workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { performanceMemory: true },
      });

      if (workspace?.performanceMemory) {
        const perfInsights = workspace.performanceMemory as unknown as PerformanceInsights;
        performanceContext = loadPerformanceContext(perfInsights);
      }

      // Fetch trending topics
      const trendData = await fetchTrendingContext(workspaceId);
      if (trendData.topics.length > 0) {
        trendContext = buildTrendContext(trendData.topics);
      }
    } catch (error) {
      logger.warn("campaign.plan.context_fetch_failed", {
        workspaceId,
        error: String(error),
      });
      // Continue without context - graceful degradation
    }
  }

  let systemPrompt = buildCampaignPlanPrompt(brief, performanceContext, trendContext);

  if (brandCtx) {
    systemPrompt += `\n\nBrand Context:\n`;
    systemPrompt += `Brand: ${brandCtx.brandSummary}\n`;
    if (brandCtx.identity.productDesc) systemPrompt += `Product: ${brandCtx.identity.productDesc}\n`;
    if (brandCtx.audience.audienceType) systemPrompt += `Audience: ${brandCtx.audience.audienceType}\n`;
    if (brandCtx.goals.length > 0) systemPrompt += `Goals: ${brandCtx.goals.join(", ")}\n`;
  }

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Generate the campaign plan for: ${brief.name}` },
  ]);

  const content = typeof response.content === "string" ? response.content : String(response.content);
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "");

  let phases: GeneratedPhase[];
  try {
    const parsed = JSON.parse(cleaned);
    phases = Array.isArray(parsed) ? parsed : parsed.phases ?? [];
  } catch {
    logger.error("campaign.plan.parse_failed", { rawContent: content.slice(0, 500) });
    throw new Error("Failed to parse campaign plan from AI response");
  }

  return phases.map((p, i) => ({
    name: p.name ?? `Phase ${i + 1}`,
    phase: (p.phase ?? "CUSTOM") as CampaignPhaseType,
    order: p.order ?? i,
    description: p.description ?? "",
  }));
}

export async function generatePhasePosts(
  phase: { name: string; phase: CampaignPhaseType; description: string | null },
  brief: CampaignBrief,
  brandCtx: BrandContextForAI | null,
  targetPlatforms: string[],
  previousPosts?: Array<{ platform: string; content: string }>,
  workspaceId?: string,
): Promise<GeneratedPost[]> {
  const llm = createLLM({ temperature: 0.8 });
  const results: GeneratedPost[] = [];

  let performanceContext = "";
  if (workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { performanceMemory: true },
      });
      if (workspace?.performanceMemory) {
        performanceContext = loadPerformanceContext(workspace.performanceMemory as unknown as PerformanceInsights);
      }
    } catch (error) {
      logger.warn("campaign.phase.load_perf_context_failed", { workspaceId, error: String(error) });
    }
  }

  for (const platform of targetPlatforms) {
    const charLimit = PLATFORM_CHAR_LIMITS[platform] ?? null;

    const systemPrompt = buildPhasePostSystemPrompt(
      phase.phase,
      phase.description,
      { name: brief.name, goal: brief.goal, audience: brief.audience },
      brandCtx,
      undefined,
      performanceContext || undefined,
    );

    const userPrompt = buildPhasePostUserPrompt(
      phase.phase,
      platform,
      charLimit,
      previousPosts,
    );

    try {
      const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      let content = typeof response.content === "string" ? response.content : String(response.content);
      content = content.trim();

      if (charLimit && content.length > charLimit) {
        const shortener = createLLM({ temperature: 0.2 });
        const shortened = await shortener.invoke([
          { role: "system", content: `Shorten this post to fit within ${charLimit} characters while preserving the core message, tone, and campaign narrative.` },
          { role: "user", content },
        ]);
        content = (typeof shortened.content === "string" ? shortened.content : String(shortened.content)).trim();
      }

      results.push({ platform, content, charCount: content.length });
    } catch (err) {
      logger.error("campaign.phase.platform_error", {
        phase: phase.phase,
        platform,
        error: String(err),
      });
      throw err;
    }
  }

  return results;
}

function scorePostQuality(content: string, charLimit: number | null, platform: string, brandCtx: BrandContextForAI | null): { score: number; breakdown: QualityBreakdown } {
  // Hook strength (0-25): Does the opening grab attention in the first line?
  let hook = 10; // base
  const firstLine = content.split("\n")[0] ?? "";
  const hasQuestionOpening = /^(how|what|why|when|where|who|can|do|is|are|did|will)\b/i.test(firstLine.trim());
  const hasStatisticOpening = /^\d+[%x]|\d+\s*(percent|times|million|billion)/i.test(firstLine.trim());
  const hasBoldOpening = /^["""]|^\*\*|^[A-Z][A-Z\s]{5,}/.test(firstLine.trim());
  const hasEmojiOpening = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(firstLine.trim());
  if (hasQuestionOpening) hook += 6;
  if (hasStatisticOpening) hook += 5;
  if (hasBoldOpening) hook += 4;
  if (hasEmojiOpening) hook += 2;
  if (firstLine.length > 0 && firstLine.length < 120) hook += 3; // punchy first line
  hook = Math.min(25, Math.max(0, hook));

  // Platform fit (0-25): Does the content match platform conventions?
  let platformFit = 15; // base
  if (charLimit) {
    const lengthRatio = content.length / charLimit;
    if (lengthRatio >= 0.6 && lengthRatio <= 0.9) platformFit += 5;
    else if (lengthRatio >= 0.4 && lengthRatio <= 0.95) platformFit += 3;
    else if (lengthRatio < 0.3) platformFit -= 5;
    else if (content.length > charLimit) platformFit -= 10;
  } else {
    if (content.length >= 200) platformFit += 5;
    else if (content.length >= 100) platformFit += 3;
  }
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (platform === "instagram" || platform === "tiktok") {
    if (hashtagCount >= 3 && hashtagCount <= 10) platformFit += 3;
    else if (hashtagCount >= 1) platformFit += 1;
  } else if (platform === "linkedin") {
    if (hashtagCount >= 3 && hashtagCount <= 5) platformFit += 3;
    else if (hashtagCount > 5) platformFit -= 2;
  } else {
    if (hashtagCount >= 1 && hashtagCount <= 3) platformFit += 2;
    else if (hashtagCount > 5) platformFit -= 2;
  }
  const hasParagraphs = content.split("\n\n").length > 1;
  if (hasParagraphs && (platform === "linkedin" || platform === "facebook")) platformFit += 2;
  platformFit = Math.min(25, Math.max(0, platformFit));

  // Brand alignment (0-25): Does it match the brand voice and avoid banned words?
  let brandAlignment = 20; // base
  if (brandCtx?.voice.bannedWords?.length) {
    const contentLower = content.toLowerCase();
    const bannedFound = brandCtx.voice.bannedWords.filter((w) =>
      contentLower.includes(w.toLowerCase())
    );
    if (bannedFound.length > 0) {
      brandAlignment -= bannedFound.length * 8;
    }
  }
  if (brandCtx?.voice.tonePreset) {
    brandAlignment += 3; // bonus for having a defined tone (AI was guided)
  }
  brandAlignment = Math.min(25, Math.max(0, brandAlignment));

  // Engagement potential (0-25): Does it include a CTA, question, or emotional trigger?
  let engagementPotential = 10; // base
  const hasQuestion = /\?/.test(content);
  const hasCallToAction = /\b(try|get|learn|discover|join|sign up|start|click|check|explore|share|comment|tell|link in|tap)\b/i.test(content);
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(content);
  const hasEmotionalTrigger = /\b(you|your|imagine|secret|finally|new|free|exclusive|limited|don't miss|urgent|excited|thrilled|proud)\b/i.test(content);
  if (hasQuestion) engagementPotential += 5;
  if (hasCallToAction) engagementPotential += 5;
  if (hasEmoji) engagementPotential += 2;
  if (hasEmotionalTrigger) engagementPotential += 3;
  engagementPotential = Math.min(25, Math.max(0, engagementPotential));

  const overall = hook + platformFit + brandAlignment + engagementPotential;

  return {
    score: Math.max(0, Math.min(100, overall)),
    breakdown: {
      overall: Math.max(0, Math.min(100, overall)),
      hook,
      platformFit,
      brandAlignment,
      engagementPotential,
    },
  };
}

export async function generatePhasePostsWithVariants(
  phase: { name: string; phase: CampaignPhaseType; description: string | null },
  brief: CampaignBrief,
  brandCtx: BrandContextForAI | null,
  targetPlatforms: string[],
  previousPosts?: Array<{ platform: string; content: string }>,
  workspaceId?: string,
): Promise<GeneratedVariant[]> {
  const results: GeneratedVariant[] = [];

  let performanceContext = "";
  if (workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { performanceMemory: true },
      });
      if (workspace?.performanceMemory) {
        performanceContext = loadPerformanceContext(workspace.performanceMemory as unknown as PerformanceInsights);
      }
    } catch (error) {
      logger.warn("campaign.phase_variants.load_perf_context_failed", { workspaceId, error: String(error) });
    }
  }

  for (let variantIndex = 0; variantIndex < 2; variantIndex++) {
    const temperature = variantIndex === 0 ? 0.7 : 0.9;
    const llm = createLLM({ temperature });

    for (const platform of targetPlatforms) {
      const charLimit = PLATFORM_CHAR_LIMITS[platform] ?? null;

      const systemPrompt = buildPhasePostSystemPrompt(
        phase.phase,
        phase.description,
        { name: brief.name, goal: brief.goal, audience: brief.audience },
        brandCtx,
        undefined,
        performanceContext || undefined,
      );

      const userPrompt = buildPhasePostUserPrompt(
        phase.phase,
        platform,
        charLimit,
        previousPosts,
      );

      try {
        const response = await llm.invoke([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]);

        let content = typeof response.content === "string" ? response.content : String(response.content);
        content = content.trim();

        if (charLimit && content.length > charLimit) {
          const shortener = createLLM({ temperature: 0.2 });
          const shortened = await shortener.invoke([
            { role: "system", content: `Shorten this post to fit within ${charLimit} characters while preserving the core message, tone, and campaign narrative.` },
            { role: "user", content },
          ]);
          content = (typeof shortened.content === "string" ? shortened.content : String(shortened.content)).trim();
        }

        const { score: qualityScore, breakdown: qualityBreakdown } = scorePostQuality(content, charLimit, platform, brandCtx);

        results.push({
          platform,
          content,
          charCount: content.length,
          variantIndex,
          qualityScore,
          qualityBreakdown,
        });
      } catch (err) {
        logger.error("campaign.phase.platform_variant_error", {
          phase: phase.phase,
          platform,
          variantIndex,
          error: String(err),
        });
        throw err;
      }
    }
  }

  return results;
}

export async function loadCampaignBrandContext(workspaceId: string): Promise<BrandContextForAI | null> {
  return loadBrandContextForAI(workspaceId);
}
