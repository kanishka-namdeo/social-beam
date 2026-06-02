import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

const SaveBrandContextSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to save brand context for'),
  businessName: z.string().optional().describe('Business/brand name'),
  tagline: z.string().optional().describe('Brand tagline'),
  websiteUrl: z.string().optional().describe('Brand website URL'),
  industry: z.string().optional().describe('Industry category'),
  productDesc: z.string().optional().describe('Product/service description (2-3 sentences)'),
  tonePreset: z.string().optional().describe('Brand tone preset'),
  voiceDescription: z.string().optional().describe('Free-form brand voice description'),
  bannedWords: z.array(z.string()).optional().describe('Words/phrases never to use'),
  voiceExamples: z.array(z.object({
    text: z.string(),
    source: z.string().optional(),
  })).optional().describe('Sample posts or voice examples'),
  audienceType: z.string().optional().describe('b2b | b2c | both'),
  demographics: z.record(z.string(), z.unknown()).optional().describe('Audience demographics'),
  interests: z.array(z.string()).optional().describe('Topics the audience cares about'),
  painPoints: z.array(z.string()).optional().describe('Problems the brand solves'),
  competitors: z.array(z.string()).optional().describe('Competitor names/accounts'),
  goals: z.array(z.string()).optional().describe('Business goals: awareness, leads, sales, community, thought_leadership'),
});

const GetBrandContextSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to query brand context for'),
});

export const saveBrandContextTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const parsed = SaveBrandContextSchema.parse(input);
    const { workspaceId, ...data } = parsed;

    logger.debug('tool.invoke', { toolName: 'save_brand_context', workspaceId });

    try {
      await prisma.brandContext.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          ...data,
          voiceExamples: data.voiceExamples as Prisma.InputJsonValue | undefined,
          demographics: data.demographics as Prisma.InputJsonValue | undefined,
          trainingStatus: 'trained',
          lastTrainedAt: new Date(),
        },
        update: {
          ...data,
          voiceExamples: data.voiceExamples as Prisma.InputJsonValue | undefined,
          demographics: data.demographics as Prisma.InputJsonValue | undefined,
          trainingStatus: 'trained',
          lastTrainedAt: new Date(),
        },
      });

      logger.info('tool.complete', { toolName: 'save_brand_context', workspaceId, duration: Date.now() - start });
      return JSON.stringify({ success: true, message: 'Brand context saved' });
    } catch (err) {
      logger.error('tool.error', { toolName: 'save_brand_context', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to save brand context: ${err}` });
    }
  },
  {
    name: 'save_brand_context',
    description: 'Save the brand context profile for a workspace. Used during onboarding brand context training.',
    schema: SaveBrandContextSchema,
  }
);

export const getBrandContextTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId } = GetBrandContextSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'get_brand_context', workspaceId });

    try {
      const context = await prisma.brandContext.findUnique({
        where: { workspaceId },
        include: { PlatformContext: true },
      });

      if (!context) {
        logger.info('tool.complete', { toolName: 'get_brand_context', workspaceId, duration: Date.now() - start, found: false });
        return JSON.stringify({ context: null, message: 'No brand context found' });
      }

      logger.info('tool.complete', { toolName: 'get_brand_context', workspaceId, duration: Date.now() - start, found: true });
      return JSON.stringify({ context });
    } catch (err) {
      logger.error('tool.error', { toolName: 'get_brand_context', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to get brand context: ${err}` });
    }
  },
  {
    name: 'get_brand_context',
    description: 'Retrieve the saved brand context for a workspace, including platform contexts.',
    schema: GetBrandContextSchema,
  }
);

const SavePlatformContextSchema = z.object({
  workspaceId: z.string().describe('The workspace ID'),
  platform: z.string().describe('Platform name: instagram, facebook, x, linkedin, tiktok, pinterest'),
  platformTone: z.string().optional().describe('How tone shifts on this platform'),
  contentMix: z.record(z.string(), z.unknown()).optional().describe('Content mix percentages'),
  postingCadence: z.string().optional().describe('Posting frequency'),
  hashtagStrategy: z.record(z.string(), z.unknown()).optional().describe('Hashtag strategy config'),
  visualStyle: z.string().optional().describe('Visual style for this platform'),
  engagementStyle: z.string().optional().describe('Engagement style for this platform'),
  platformRules: z.array(z.string()).optional().describe('Platform-specific rules'),
});

export const savePlatformContextTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const parsed = SavePlatformContextSchema.parse(input);
    const { workspaceId, platform, ...data } = parsed;

    logger.debug('tool.invoke', { toolName: 'save_platform_context', workspaceId, platform });

    try {
      const brandContext = await prisma.brandContext.findUnique({
        where: { workspaceId },
        select: { id: true },
      });

      if (!brandContext) {
        logger.warn('tool.complete', { toolName: 'save_platform_context', workspaceId, platform, duration: Date.now() - start, found: false });
        return JSON.stringify({ error: 'No brand context found for this workspace' });
      }

      await prisma.platformContext.upsert({
        where: {
          brandContextId_platform: {
            brandContextId: brandContext.id,
            platform,
          },
        },
        create: {
          id: crypto.randomUUID(),
          brandContextId: brandContext.id,
          platform,
          ...data,
          contentMix: data.contentMix as Prisma.InputJsonValue | undefined,
          hashtagStrategy: data.hashtagStrategy as Prisma.InputJsonValue | undefined,
        },
        update: {
          ...data,
          contentMix: data.contentMix as Prisma.InputJsonValue | undefined,
          hashtagStrategy: data.hashtagStrategy as Prisma.InputJsonValue | undefined,
        },
      });

      logger.info('tool.complete', { toolName: 'save_platform_context', workspaceId, platform, duration: Date.now() - start });
      return JSON.stringify({ success: true, message: `Platform context saved for ${platform}` });
    } catch (err) {
      logger.error('tool.error', { toolName: 'save_platform_context', workspaceId, platform, error: String(err) });
      return JSON.stringify({ error: `Failed to save platform context: ${err}` });
    }
  },
  {
    name: 'save_platform_context',
    description: 'Save platform-specific context for a workspace. Requires brand context to exist first.',
    schema: SavePlatformContextSchema,
  }
);

// Deprecated: kept for backward compatibility during transition
const SaveBrandVoiceSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to save brand voice for'),
  tonePreset: z.enum(['professional', 'casual', 'witty', 'educational', 'inspirational', 'bold']).optional().describe('Preset brand tone'),
  description: z.string().optional().describe('Free-form brand voice description'),
  examples: z.array(z.string()).optional().describe('Sample posts that represent the brand voice'),
  perPlatform: z.record(z.string(), z.object({
    tone: z.string().optional(),
    adjustments: z.string().optional(),
  })).optional().describe('Per-platform voice overrides'),
});

const GetBrandVoiceSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to query brand voice for'),
});

/** @deprecated Use saveBrandContextTool instead */
export const saveBrandVoiceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId, tonePreset, description, examples, perPlatform } = SaveBrandVoiceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'save_brand_voice', workspaceId, tonePreset });

    try {
      await prisma.brandVoice.upsert({
        where: { workspaceId },
        create: {
          id: crypto.randomUUID(),
          workspaceId,
          tonePreset,
          description,
          examples: examples ?? [],
          perPlatform,
        },
        update: {
          tonePreset,
          description,
          examples: examples ?? undefined,
          perPlatform,
        },
      });

      logger.info('tool.complete', { toolName: 'save_brand_voice', workspaceId, duration: Date.now() - start });
      return JSON.stringify({ success: true, message: 'Brand voice profile saved' });
    } catch (err) {
      logger.error('tool.error', { toolName: 'save_brand_voice', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to save brand voice: ${err}` });
    }
  },
  {
    name: 'save_brand_voice',
    description: 'Save the brand voice profile for a workspace. Used during onboarding brand voice training.',
    schema: SaveBrandVoiceSchema,
  }
);

/** @deprecated Use getBrandContextTool instead */
export const getBrandVoiceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId } = GetBrandVoiceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'get_brand_voice', workspaceId });

    try {
      const voice = await prisma.brandVoice.findUnique({
        where: { workspaceId },
        select: { tonePreset: true, description: true, examples: true, perPlatform: true },
      });

      if (!voice) {
        logger.info('tool.complete', { toolName: 'get_brand_voice', workspaceId, duration: Date.now() - start, found: false });
        return JSON.stringify({ voice: null, message: 'No brand voice profile found' });
      }

      logger.info('tool.complete', { toolName: 'get_brand_voice', workspaceId, duration: Date.now() - start, found: true });
      return JSON.stringify({ voice });
    } catch (err) {
      logger.error('tool.error', { toolName: 'get_brand_voice', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to get brand voice: ${err}` });
    }
  },
  {
    name: 'get_brand_voice',
    description: 'Retrieve the saved brand voice profile for a workspace.',
    schema: GetBrandVoiceSchema,
  }
);

const PreviewBrandVoiceSchema = z.object({
  topic: z.string().describe('The topic or subject to write a post about'),
  voiceProfile: z.object({
    tonePreset: z.enum(['professional', 'casual', 'witty', 'educational', 'inspirational', 'bold']).optional(),
    description: z.string().optional(),
    examples: z.array(z.string()).optional(),
    perPlatform: z.record(z.string(), z.object({
      tone: z.string().optional(),
      adjustments: z.string().optional(),
    })).optional(),
  }).describe('The brand voice profile to apply'),
});

export const previewBrandVoiceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { topic, voiceProfile } = PreviewBrandVoiceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'preview_brand_voice', topic, tonePreset: voiceProfile.tonePreset });

    try {
      const model = new ChatOpenAI({
        apiKey: process.env.API_KEY,
        configuration: { baseURL: process.env.BASE_URL },
        modelName: process.env.MODEL ?? 'qwen3.6-plus',
        temperature: 0.7,
      });

      const voiceDescription = voiceProfile.description ?? 'no specific description provided';
      const tonePreset = voiceProfile.tonePreset ?? 'professional';
      const examplesText = voiceProfile.examples && voiceProfile.examples.length > 0
        ? `\n\nExample posts that match this voice:\n${voiceProfile.examples.map((ex: string, i: number) => `${i + 1}. ${ex}`).join('\n')}`
        : '';

      const prompt = `You are generating sample social media posts for a brand.

Topic: ${topic}
Brand tone: ${tonePreset}
Voice description: ${voiceDescription}
${examplesText}

Generate exactly 3 short social media posts (under 280 characters each) that match this brand voice. Each post should be distinct and suitable for a different platform.

Return the posts as a JSON array with objects containing:
- "platform": the suggested platform (e.g., "Instagram", "X", "LinkedIn")
- "content": the post text

Return ONLY valid JSON, no markdown formatting.`;

      const response = await model.invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : String(response.content);

      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const posts = JSON.parse(cleaned);

      logger.info('tool.complete', { toolName: 'preview_brand_voice', topic, duration: Date.now() - start });
      return JSON.stringify({ success: true, posts });
    } catch (err) {
      logger.error('tool.error', { toolName: 'preview_brand_voice', topic, error: String(err) });
      return JSON.stringify({ error: `Failed to generate preview posts: ${err}` });
    }
  },
  {
    name: 'preview_brand_voice',
    description: 'Generate 3 sample posts given a topic and brand voice profile. Returns sample posts as JSON.',
    schema: PreviewBrandVoiceSchema,
  }
);
