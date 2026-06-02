import { ChatOpenAI } from '@langchain/openai';
import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.3,
  maxRetries: 2,
  timeout: 90_000,
});

const BASE_SYSTEM_PROMPT = `You are SocialBeam's brand analyzer. Given crawled website content, extract brand identity fields.

Return ONLY valid JSON matching this exact schema — no explanation, no markdown, no code fences:
{
  "businessName": "string",
  "tagline": "string",
  "websiteUrl": "string",
  "industry": "string",
  "productDesc": "string",
  "tonePreset": "professional|casual|witty|educational|inspirational|bold",
  "voiceDescription": "string describing the brand voice",
  "bannedWords": ["string"],
  "audienceType": "string",
  "demographics": {
    "ageRange": "string",
    "locations": ["string"],
    "incomeLevel": "string"
  },
  "interests": ["string"],
  "painPoints": ["string"],
  "competitors": ["string"],
  "goals": ["string — must be from: awareness, leads, sales, community, thought_leadership"]
}`;

const REFINE_SYSTEM_PROMPT = `You are SocialBeam's brand analyzer. The user has reviewed the previously extracted brand context and provided feedback. Revise the brand context fields to match their feedback.

Return ONLY valid JSON matching this exact schema — no explanation, no markdown, no code fences:
{
  "businessName": "string",
  "tagline": "string",
  "websiteUrl": "string",
  "industry": "string",
  "productDesc": "string",
  "tonePreset": "professional|casual|witty|educational|inspirational|bold",
  "voiceDescription": "string describing the brand voice",
  "bannedWords": ["string"],
  "audienceType": "string",
  "demographics": {
    "ageRange": "string",
    "locations": ["string"],
    "incomeLevel": "string"
  },
  "interests": ["string"],
  "painPoints": ["string"],
  "competitors": ["string"],
  "goals": ["string — must be from: awareness, leads, sales, community, thought_leadership"]
}`;

function buildUserPrompt(crawledContent: Record<string, { page: string; zone: string; weight: number; text: string }>): string {
  const entries = Object.entries(crawledContent).sort((a, b) => b[1].weight - a[1].weight);

  const sections = entries.map(([, { page, zone, weight, text }]) => {
    return `[${page}/${zone}] (weight: ${weight})\n${text}`;
  });

  return `Analyze the following website content. Higher weight means the content is more important for brand identity:\n\n${sections.join('\n\n---\n\n')}`;
}

function buildDescriptionPrompt(brandDescription: string): string {
  return `Extract brand identity fields from this brand description. The user described their brand in their own words — fill in the schema below by inferring what you can and being honest about what is uncertain:\n\n${brandDescription}`;
}

function buildRefineUserPrompt(
  currentDraft: Record<string, unknown>,
  userFeedback: string,
): string {
  return `Current brand context:\n${JSON.stringify(currentDraft, null, 2)}\n\nUser feedback: ${userFeedback}\n\nRevise the brand context fields to incorporate this feedback. Return the complete updated JSON.`;
}

export async function brandAnalyzerNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('brandAnalyzerNode: entering', { contentCount: Object.keys(state.crawledContent).length, hasFeedback: !!state.userFeedback });

  // Refinement path: user provided feedback after review
  if (state.userFeedback && Object.keys(state.brandContextDraft).length > 0) {
    logger.info('brandAnalyzerNode: refining based on user feedback', { feedback: state.userFeedback.slice(0, 200) });

    try {
      const response = await model.invoke([
        new HumanMessage({ content: REFINE_SYSTEM_PROMPT }),
        new HumanMessage({ content: buildRefineUserPrompt(state.brandContextDraft, state.userFeedback) }),
      ]);

      const rawContent = typeof response.content === 'string' ? response.content : '';
      const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const refinedDraft = JSON.parse(cleaned) as Record<string, unknown>;

      logger.info('brandAnalyzerNode: refinement complete', { fieldCount: Object.keys(refinedDraft).length });

      return {
        brandContextDraft: refinedDraft,
        currentStep: 'adapt',
        userFeedback: '',
      };
    } catch (err) {
      logger.error('brandAnalyzerNode: failed to parse refinement response', { error: String(err) });
      return {
        currentStep: 'review',
        userFeedback: '',
        messages: [new AIMessage('The refinement encountered an issue. Please try again or describe what to change.')],
      };
    }
  }

  // Initial analysis path
  if (Object.keys(state.crawledContent).length === 0 && !state.brandDescription) {
    logger.warn('brandAnalyzerNode: no crawled content or brandDescription available');
    return {
      brandContextDraft: { error: 'No content available for analysis' },
      currentStep: 'error',
      messages: [new AIMessage('No content was found. Please provide a website URL or brand description to analyze.')],
    };
  }

  // Description-based analysis (no crawl)
  if (Object.keys(state.crawledContent).length === 0 && state.brandDescription) {
    logger.info('brandAnalyzerNode: analyzing from brandDescription', { descriptionLength: state.brandDescription.length });

    try {
      const response = await model.invoke([
        new HumanMessage({ content: BASE_SYSTEM_PROMPT }),
        new HumanMessage({ content: buildDescriptionPrompt(state.brandDescription) }),
      ]);

      const rawContent = typeof response.content === 'string' ? response.content : '';
      const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsedDraft = JSON.parse(cleaned) as Record<string, unknown>;

      logger.info('brandAnalyzerNode: description analysis complete', { fieldCount: Object.keys(parsedDraft).length });

      return {
        brandContextDraft: parsedDraft,
        currentStep: 'adapt',
      };
    } catch (err) {
      logger.error('brandAnalyzerNode: failed to parse LLM response from description', { error: String(err) });
      return {
        brandContextDraft: {},
        currentStep: 'error',
        messages: [new AIMessage('The brand analysis encountered an issue while parsing results. Please try again or describe your brand manually.')],
      };
    }
  }

  // Website-based analysis (with crawled content)
  try {
    const response = await model.invoke([
      new HumanMessage({ content: BASE_SYSTEM_PROMPT }),
      new HumanMessage({ content: buildUserPrompt(state.crawledContent) }),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsedDraft = JSON.parse(cleaned) as Record<string, unknown>;

    logger.info('brandAnalyzerNode: analysis complete', { fieldCount: Object.keys(parsedDraft).length });

    return {
      brandContextDraft: parsedDraft,
      currentStep: 'adapt',
    };
  } catch (err) {
    logger.error('brandAnalyzerNode: failed to parse LLM response', { error: String(err) });
    return {
      brandContextDraft: {},
      currentStep: 'error',
      messages: [new AIMessage('The brand analysis encountered an issue while parsing results. Please try again or describe your brand manually.')],
    };
  }
}