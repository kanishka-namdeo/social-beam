import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { success, error, requireContext, requirePremiumScope, premiumScopeError } from '../tool-helpers';
import { logToolCall } from '../audit-log';
import { prisma } from '@/lib/prisma';

export function registerBrandTools(server: McpServer, options?: { skipAiTools?: boolean }) {
  server.registerTool(
    'brand_get_context',
    {
      description: 'Get the current brand context including business info, voice, platform-specific settings, and learned field states.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ctx = requireContext();
      try {
        const brand = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
          include: {
            PlatformContext: true,
            BrandFieldState: true,
          },
        });
        if (!brand) return error('No brand context found', 'Set up brand context first via the dashboard');
        await logToolCall(ctx, 'brand_get_context', {}, true);
        return success({ brand });
      } catch (e) {
        await logToolCall(ctx, 'brand_get_context', {}, false, String(e));
        return error('Failed to get brand context', String(e));
      }
    }
  );

  server.registerTool(
    'brand_update',
    {
      description: 'Update brand context fields such as business name, tagline, tone, voice, audience, and goals.',
      inputSchema: z.object({
        business_name: z.string().optional().describe('Business or brand name'),
        tagline: z.string().optional().describe('Brand tagline or slogan'),
        website_url: z.string().optional().describe('Brand website URL'),
        industry: z.string().optional().describe('Industry category'),
        product_desc: z.string().optional().describe('Product or service description'),
        tone_preset: z.string().optional().describe('Tone preset (e.g., professional, casual, playful)'),
        voice_description: z.string().optional().describe('Detailed voice description'),
        banned_words: z.array(z.string()).optional().describe('Words to avoid in content'),
        audience_type: z.string().optional().describe('Target audience type'),
        goals: z.array(z.string()).optional().describe('Brand goals'),
      }),
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const existing = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });
        if (!existing) return error('No brand context found', 'Set up brand context first via the dashboard');

        const updateData: Record<string, unknown> = {};
        if (args.business_name !== undefined) updateData.businessName = args.business_name;
        if (args.tagline !== undefined) updateData.tagline = args.tagline;
        if (args.website_url !== undefined) updateData.websiteUrl = args.website_url;
        if (args.industry !== undefined) updateData.industry = args.industry;
        if (args.product_desc !== undefined) updateData.productDesc = args.product_desc;
        if (args.tone_preset !== undefined) updateData.tonePreset = args.tone_preset;
        if (args.voice_description !== undefined) updateData.voiceDescription = args.voice_description;
        if (args.banned_words !== undefined) updateData.bannedWords = args.banned_words;
        if (args.audience_type !== undefined) updateData.audienceType = args.audience_type;
        if (args.goals !== undefined) updateData.goals = args.goals;

        const brand = await prisma.brandContext.update({
          where: { workspaceId: ctx.workspaceId },
          data: updateData,
        });
        await logToolCall(ctx, 'brand_update', args, true);
        return success({ brand, message: 'Brand context updated successfully' });
      } catch (e) {
        await logToolCall(ctx, 'brand_update', args, false, String(e));
        return error('Failed to update brand context', String(e));
      }
    }
  );

  server.registerTool(
    'brand_health',
    {
      description: 'Get brand context health score based on field completeness and confidence levels.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const ctx = requireContext();
      try {
        const brand = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
          include: { BrandFieldState: true },
        });
        if (!brand) return error('No brand context found', 'Set up brand context first via the dashboard');

        const coreFields = ['businessName', 'tagline', 'tonePreset', 'voiceDescription', 'productDesc'];
        const filledFields = coreFields.filter((f) => {
          const val = (brand as Record<string, unknown>)[f];
          return val !== null && val !== undefined && val !== '';
        });

        const avgConfidence = brand.BrandFieldState.length
          ? brand.BrandFieldState.reduce((sum, f) => sum + f.confidence, 0) / brand.BrandFieldState.length
          : 0;

        const healthScore = Math.round(
          ((filledFields.length / coreFields.length) * 0.5 + avgConfidence * 0.5) * 100
        );

        await logToolCall(ctx, 'brand_health', {}, true);
        return success({
          healthScore,
          coreFieldsFilled: filledFields.length,
          coreFieldsTotal: coreFields.length,
          averageConfidence: Math.round(avgConfidence * 100) / 100,
          fieldStates: brand.BrandFieldState.length,
          trainingStatus: brand.trainingStatus,
        });
      } catch (e) {
        await logToolCall(ctx, 'brand_health', {}, false, String(e));
        return error('Failed to get brand health', String(e));
      }
    }
  );

  if (!options?.skipAiTools) {
    server.registerTool(
      'brand_test',
      {
        description: 'Test brand context by generating sample posts that match the brand voice.',
        inputSchema: z.object({
          platform: z.string().optional().describe('Platform to generate sample for'),
          topic: z.string().optional().describe('Topic for the sample post'),
        }),
        annotations: { readOnlyHint: true },
      },
      async (args) => {
        const ctx = requireContext();
        if (!requirePremiumScope('brand_test')) {
          return premiumScopeError();
        }
        try {
          const { createLLM } = await import('@/lib/ai/model');
          const { loadBrandContextForAI, formatBrandSystemPrompt } = await import('@/lib/ai/brand-context-loader');

          const brandCtx = await loadBrandContextForAI(ctx.workspaceId);
          if (!brandCtx) return error('No brand context found', 'Set up brand context first via the dashboard');

          const model = createLLM({ temperature: 0.8 });
          const platform = args.platform || 'general';
          const topic = args.topic || 'a product update';

          const systemPrompt = `${formatBrandSystemPrompt(brandCtx)}\n\nGenerate a sample social media post for ${platform} that perfectly matches the brand voice above. The post should be about: ${topic}`;

          const samples: string[] = [];
          for (let i = 0; i < 3; i++) {
            const response = await model.invoke([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate sample post ${i + 1} of 3. Make each one different in style but consistent with the brand voice.` },
            ]);
            samples.push(typeof response.content === 'string' ? response.content : JSON.stringify(response.content));
          }

          await logToolCall(ctx, 'brand_test', args, true);
          return success({ samples, platform, topic, brandVoice: brandCtx.voice, message: 'Generated 3 brand-aligned sample posts' });
        } catch (e) {
          await logToolCall(ctx, 'brand_test', args, false, String(e));
          return error('Failed to test brand voice', String(e));
        }
      }
    );
  }

  server.registerTool(
    'brand_history',
    {
      description: 'Get version history of brand context changes.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(10).describe('Number of versions to return'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const brand = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });
        if (!brand) return error('No brand context found', 'Set up brand context first via the dashboard');

        const versions = await prisma.brandContextVersion.findMany({
          where: { brandContextId: brand.id },
          orderBy: { createdAt: 'desc' },
          take: args.limit,
        });
        await logToolCall(ctx, 'brand_history', args, true);
        return success({ versions });
      } catch (e) {
        await logToolCall(ctx, 'brand_history', args, false, String(e));
        return error('Failed to get brand history', String(e));
      }
    }
  );

  server.registerTool(
    'brand_learning_signals',
    {
      description: 'Get learning signals that the brand context has accumulated from content performance.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20).describe('Number of signals to return'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const ctx = requireContext();
      try {
        const brand = await prisma.brandContext.findUnique({
          where: { workspaceId: ctx.workspaceId },
        });
        if (!brand) return error('No brand context found', 'Set up brand context first via the dashboard');

        const signals = await prisma.brandLearningSignal.findMany({
          where: { brandContextId: brand.id },
          orderBy: { createdAt: 'desc' },
          take: args.limit,
        });
        await logToolCall(ctx, 'brand_learning_signals', args, true);
        return success({ signals });
      } catch (e) {
        await logToolCall(ctx, 'brand_learning_signals', args, false, String(e));
        return error('Failed to get learning signals', String(e));
      }
    }
  );
}
