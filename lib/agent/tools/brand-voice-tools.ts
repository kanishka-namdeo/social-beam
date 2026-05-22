import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

export const saveBrandVoiceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId, tonePreset, description, examples, perPlatform } = SaveBrandVoiceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'save_brand_voice', workspaceId, tonePreset });

    try {
      await prisma.brandVoice.upsert({
        where: { workspaceId },
        create: {
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
