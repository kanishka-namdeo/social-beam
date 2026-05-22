import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const SaveAudienceSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to save audience data for'),
  demographics: z.object({
    ageRange: z.string().optional(),
    locations: z.array(z.string()).optional(),
    genderDistribution: z.string().optional(),
    incomeLevel: z.string().optional(),
  }).optional().describe('Target audience demographics'),
  interests: z.array(z.string()).optional().describe('Audience interests and topics'),
  platformBehavior: z.object({
    peakPlatforms: z.array(z.string()).optional(),
    peakTimes: z.array(z.string()).optional(),
  }).optional().describe('Which platforms and times the audience is most active'),
  competitorAccounts: z.array(z.string()).optional().describe('Competitor accounts the audience follows'),
  painPoints: z.array(z.string()).optional().describe('Problems the audience faces that the brand solves'),
});

const GetAudienceSchema = z.object({
  workspaceId: z.string().describe('The workspace ID to query audience data for'),
});

export const saveAudienceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId, demographics, interests, platformBehavior, competitorAccounts, painPoints } =
      SaveAudienceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'save_audience', workspaceId });

    const audienceData: Record<string, unknown> = {};
    if (demographics) audienceData.demographics = demographics;
    if (interests) audienceData.interests = interests;
    if (platformBehavior) audienceData.platformBehavior = platformBehavior;
    if (competitorAccounts) audienceData.competitorAccounts = competitorAccounts;
    if (painPoints) audienceData.painPoints = painPoints;

    try {
      let profile = await prisma.userProfile.findUnique({
        where: { workspaceId },
        select: { id: true },
      });

      if (!profile) {
        profile = await prisma.userProfile.create({
          data: { workspaceId },
          select: { id: true },
        });
      }

      await prisma.userProfile.update({
        where: { workspaceId },
        data: { audience: audienceData as unknown as Prisma.InputJsonValue },
      });

      logger.info('tool.complete', { toolName: 'save_audience', workspaceId, duration: Date.now() - start });
      return JSON.stringify({ success: true, message: 'Audience profile saved' });
    } catch (err) {
      logger.error('tool.error', { toolName: 'save_audience', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to save audience: ${err}` });
    }
  },
  {
    name: 'save_audience',
    description: 'Save the target audience profile for a workspace. Used during onboarding audience definition.',
    schema: SaveAudienceSchema,
  }
);

export const getAudienceTool = tool(
  async (input: unknown) => {
    const start = Date.now();
    const { workspaceId } = GetAudienceSchema.parse(input);

    logger.debug('tool.invoke', { toolName: 'get_audience', workspaceId });

    try {
      const profile = await prisma.userProfile.findUnique({
        where: { workspaceId },
        select: { audience: true },
      });

      if (!profile?.audience) {
        logger.info('tool.complete', { toolName: 'get_audience', workspaceId, duration: Date.now() - start, found: false });
        return JSON.stringify({ audience: null, message: 'No audience profile found' });
      }

      logger.info('tool.complete', { toolName: 'get_audience', workspaceId, duration: Date.now() - start, found: true });
      return JSON.stringify({ audience: profile.audience });
    } catch (err) {
      logger.error('tool.error', { toolName: 'get_audience', workspaceId, error: String(err) });
      return JSON.stringify({ error: `Failed to get audience: ${err}` });
    }
  },
  {
    name: 'get_audience',
    description: 'Retrieve the saved audience profile for a workspace.',
    schema: GetAudienceSchema,
  }
);
