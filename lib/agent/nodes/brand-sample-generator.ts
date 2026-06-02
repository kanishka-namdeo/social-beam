import { ChatOpenAI } from '@langchain/openai';
import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.7,
  maxRetries: 2,
  timeout: 60_000,
});

const SYSTEM_PROMPT = `Generate 2-3 sample social media posts using the brand context and platform contexts.

Each post must:
- Be under 280 characters
- Be distinct from other posts
- Match the brand voice and platform-specific tone
- Use appropriate hashtags per the platform's hashtag strategy

Return ONLY valid JSON — no explanation, no markdown, no code fences. The response must be a JSON array:
[
  { "platform": "linkedin", "content": "..." },
  { "platform": "x", "content": "..." },
  { "platform": "instagram", "content": "..." }
]`;

function buildUserPrompt(
  brandContext: Record<string, unknown>,
  platformContexts: Record<string, Record<string, unknown>>,
): string {
  return `Generate sample posts using this brand and platform context:\n\nBrand:\n${JSON.stringify(brandContext, null, 2)}\n\nPlatform Contexts:\n${JSON.stringify(platformContexts, null, 2)}`;
}

export async function sampleGeneratorNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('sampleGeneratorNode: entering', {
    brandFields: Object.keys(state.brandContextDraft).length,
    platformCount: Object.keys(state.platformContextsDraft).length,
  });

  if (Object.keys(state.brandContextDraft).length === 0 || Object.keys(state.platformContextsDraft).length === 0) {
    logger.warn('sampleGeneratorNode: missing context for generation');
    return {
      samplePosts: [],
      currentStep: 'review',
      messages: [new AIMessage('Insufficient context to generate sample posts.')],
    };
  }

  try {
    const response = await model.invoke([
      new HumanMessage({ content: SYSTEM_PROMPT }),
      new HumanMessage({ content: buildUserPrompt(state.brandContextDraft, state.platformContextsDraft) }),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsedPosts = JSON.parse(cleaned) as Array<{ platform: string; content: string }>;

    logger.info('sampleGeneratorNode: sample posts generated', { postCount: parsedPosts.length });

    return {
      samplePosts: parsedPosts,
      currentStep: 'review',
    };
  } catch (err) {
    logger.error('sampleGeneratorNode: failed to parse LLM response', { error: String(err) });
    return {
      samplePosts: [],
      currentStep: 'error',
      messages: [new AIMessage('Failed to generate sample posts. Please try again or describe your brand manually.')],
    };
  }
}