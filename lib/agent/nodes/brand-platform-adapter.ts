import { ChatOpenAI } from '@langchain/openai';
import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.4,
  maxRetries: 2,
  timeout: 60_000,
});

function buildSystemPrompt(connectedPlatforms: string[]): string {
  const platformList = connectedPlatforms.join(', ');
  return `Given a brand context draft, generate platform-specific context for each of these CONNECTED platforms: ${platformList}.

For each platform provide:
- platformTone: string — how the brand voice shifts for this platform
- contentMix: JSON with text%, image%, video%, carousel% adding to 100
- postingCadence: string — e.g. "3x_week", "daily", "5x_week"
- hashtagStrategy: JSON with count: {min: number, max: number}, style: "mixed"|"branded"|"niche"
- visualStyle: string — visual aesthetic for this platform
- engagementStyle: string — how to engage with the audience
- platformRules: string[] — platform-specific best practices and constraints

Return ONLY valid JSON — no explanation, no markdown, no code fences. The response must be an object keyed by platform name:
{
  "${connectedPlatforms[0]}": { "platformTone": "...", "contentMix": { "text": 30, "image": 40, "video": 20, "carousel": 10 }, "postingCadence": "...", "hashtagStrategy": { "count": { "min": 3, "max": 5 }, "style": "mixed" }, "visualStyle": "...", "engagementStyle": "...", "platformRules": ["...", "..."] },
  "${connectedPlatforms[1] || '...'}": { ... }
}`;
}

function buildUserPrompt(
  brandContext: Record<string, unknown>,
  recentPostsByPlatform: Record<string, Array<{ content: string; status: string }>>,
): string {
  let prompt = `Generate platform-specific contexts based on this brand context:\n\n${JSON.stringify(brandContext, null, 2)}`;

  // Inject recent post patterns as guidance
  const platformEntries = Object.entries(recentPostsByPlatform);
  if (platformEntries.length > 0) {
    prompt += '\n\nRecent posting history per platform (used to identify patterns and suggest improvements):\n';
    for (const [platform, posts] of platformEntries) {
      const contentSamples = posts.map((p, i) => `  ${i + 1}. [${p.status}] ${p.content}`).join('\n');
      prompt += `\n${platform}:\n${contentSamples}\n`;
    }
    prompt += '\nUse these patterns to understand current posting habits and suggest meaningful improvements or adjustments.';
  }

  return prompt;
}

export async function platformAdapterNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('platformAdapterNode: entering', {
    brandContextFields: Object.keys(state.brandContextDraft).length,
    connectedPlatformCount: state.connectedPlatforms.length,
  });

  if (Object.keys(state.brandContextDraft).length === 0) {
    logger.warn('platformAdapterNode: no brand context available');
    return {
      platformContextsDraft: {},
      currentStep: 'sample',
      messages: [new AIMessage('No brand context available to generate platform contexts.')],
    };
  }

  // Phase 4: Only generate for connected platforms; fall back to all platforms if none connected
  const platforms = state.connectedPlatforms.length > 0
    ? state.connectedPlatforms
    : ['linkedin', 'instagram', 'x', 'facebook', 'tiktok', 'pinterest'];

  if (platforms.length === 0) {
    logger.warn('platformAdapterNode: no platforms to generate context for');
    return {
      platformContextsDraft: {},
      currentStep: 'sample',
      messages: [new AIMessage('No connected platforms found. Connect an account to generate platform strategies.')],
    };
  }

  try {
    const response = await model.invoke([
      new HumanMessage({ content: buildSystemPrompt(platforms) }),
      new HumanMessage({ content: buildUserPrompt(state.brandContextDraft, state.recentPostsByPlatform) }),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsedPlatforms = JSON.parse(cleaned) as Record<string, Record<string, unknown>>;

    logger.info('platformAdapterNode: platform contexts generated', { platformCount: Object.keys(parsedPlatforms).length });

    return {
      platformContextsDraft: parsedPlatforms,
      currentStep: 'sample',
    };
  } catch (err) {
    logger.error('platformAdapterNode: failed to parse LLM response', { error: String(err) });
    return {
      platformContextsDraft: {},
      currentStep: 'error',
      messages: [new AIMessage('Failed to generate platform contexts. Please try again or describe your brand manually.')],
    };
  }
}