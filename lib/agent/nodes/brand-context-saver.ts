
import { type BrandAnalyzerStateType } from "../state";
import { saveFullBrandContextTool } from "../tools/brand-context-tools";
import { createLogger } from "../logging";
import { AIMessage } from "@langchain/core/messages";

export async function contextSaverNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? "unknown", userId: state.userId ?? "unknown" });
  logger.info("contextSaverNode: entering", { messageCount: state.messages.length });

  if (!state.userConfirmed) {
    logger.warn("contextSaverNode: user not confirmed, skipping save", { userId: state.userId });
    return {
      messages: [new AIMessage("Brand context was not confirmed — nothing to save.")],
      currentStep: "done",
    };
  }

  const draft = state.brandContextDraft;
  const platformDrafts = state.platformContextsDraft;

  const toolInput = {
    workspaceId: state.workspaceId,
    businessName: draft.businessName as string | undefined,
    tagline: draft.tagline as string | undefined,
    websiteUrl: (draft.websiteUrl as string | undefined) ?? state.websiteUrl,
    industry: draft.industry as string | undefined,
    productDesc: draft.productDesc as string | undefined,
    tonePreset: draft.tonePreset as string | undefined,
    voiceDescription: draft.voiceDescription as string | undefined,
    bannedWords: (draft.bannedWords as string[]) ?? [],
    voiceExamples: (draft.voiceExamples as Array<{ text: string; source?: string }>) ?? [],
    audienceType: draft.audienceType as string | undefined,
    demographics: draft.demographics as Record<string, unknown> | undefined,
    interests: (draft.interests as string[]) ?? [],
    painPoints: (draft.painPoints as string[]) ?? [],
    competitors: (draft.competitors as string[]) ?? [],
    goals: (draft.goals as string[]) ?? [],
    platformContexts: Object.entries(platformDrafts).map(([platform, pc]) => ({
      platform,
      platformTone: pc.platformTone as string | undefined,
      contentMix: pc.contentMix as Record<string, unknown> | undefined,
      postingCadence: pc.postingCadence as string | undefined,
      hashtagStrategy: pc.hashtagStrategy as Record<string, unknown> | undefined,
      visualStyle: pc.visualStyle as string | undefined,
      engagementStyle: pc.engagementStyle as string | undefined,
      platformRules: (pc.platformRules as string[]) ?? [],
    })),
  };

  let toolResult: string;
  try {
    toolResult = await saveFullBrandContextTool.invoke(toolInput as never);
  } catch (err) {
    logger.error("contextSaverNode: tool invocation failed", { error: String(err) });
    return {
      messages: [new AIMessage(`Failed to save brand context: ${err}`)],
      currentStep: "done",
    };
  }

  let savedBrandContextId: string | undefined;
  let savedPlatformCount = 0;
  try {
    const parsed = JSON.parse(toolResult) as Record<string, unknown>;
    savedBrandContextId = typeof parsed.brandContextId === "string" ? parsed.brandContextId : undefined;
    savedPlatformCount = typeof parsed.platformCount === "number" ? parsed.platformCount : 0;
  } catch {
    // Tool result parsing failed — continue without enriched logging
  }

  logger.info("contextSaverNode: exiting", {
    toolResult,
    brandContextId: savedBrandContextId,
    platformCount: savedPlatformCount,
  });

  return {
    messages: [new AIMessage(`Brand context saved successfully. ${toolResult}`)],
    currentStep: "done",
  };
}
