import { ChatOpenAI } from '@langchain/openai';
import { type OnboardingStateType } from '../state';
import { HumanMessage } from '@langchain/core/messages';
import { fetchPostsTool } from '../tools/scraper-tools';
import { z } from 'zod';
import { createLogger } from '../logging';

const model = new ChatOpenAI({
  apiKey: process.env.API_KEY,
  configuration: { baseURL: process.env.BASE_URL },
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.3,
});

const ProfileAnalysisSchema = z.object({
  tone: z.string().describe("Overall tone of the user's posts (e.g., professional, casual, witty, educational)"),
  postTypes: z.object({
    text: z.number(),
    image: z.number(),
    video: z.number(),
    carousel: z.number(),
  }).describe('Distribution of post types'),
  imageAnalysis: z.object({
    categories: z.array(z.string()).describe('Categories of images found (e.g., product shots, lifestyle, infographics)'),
    imageFrequency: z.number().describe('Fraction of posts that include images (0-1)'),
  }).describe('Analysis of image content in posts'),
  audienceInsights: z.array(z.string()).describe('Key observations about audience engagement patterns'),
});

const systemPrompt = `You are SocialBeam's profile analyzer. Your job is to analyze a user's social media posts to understand their content style.

Based on the posts provided, analyze:
1. The overall tone and voice
2. The distribution of content types (text, image, video, carousel)
3. Image content categories if applicable
4. Audience engagement patterns and insights

Provide a structured analysis that will help personalize their experience.`;

async function fetchAndAnalyzePosts(accounts: Array<{ platform: string; status: string }>, logger: ReturnType<typeof createLogger>): Promise<z.infer<typeof ProfileAnalysisSchema>> {
  const connectedAccounts = accounts.filter(a => a.status === 'connected');

  if (connectedAccounts.length === 0) {
    logger.info('profileAnalyzer: no connected accounts');
    return {
      tone: 'unknown',
      postTypes: { text: 0, image: 0, video: 0, carousel: 0 },
      imageAnalysis: { categories: [], imageFrequency: 0 },
      audienceInsights: ['No connected accounts to analyze. Connect accounts for personalized insights.'],
    };
  }

  const allPosts: Record<string, unknown>[] = [];

  for (const account of connectedAccounts) {
    try {
      logger.debug('profileAnalyzer: fetching posts', { platform: account.platform });
      const result = await fetchPostsTool.invoke({
        platform: account.platform,
        accountId: account.platform,
        limit: 20,
      });
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (parsed.posts) {
        allPosts.push(...parsed.posts);
      }
    } catch (err) {
      logger.error('profileAnalyzer: failed to fetch posts', { platform: account.platform, error: String(err) });
    }
  }

  logger.info('profileAnalyzer: posts collected', { accountCount: connectedAccounts.length, postCount: allPosts.length });

  if (allPosts.length === 0) {
    return {
      tone: 'unknown',
      postTypes: { text: 0, image: 0, video: 0, carousel: 0 },
      imageAnalysis: { categories: [], imageFrequency: 0 },
      audienceInsights: ['No posts retrieved. Accounts may need re-connection or have no recent content.'],
    };
  }

  const structuredModel = model.withStructuredOutput(ProfileAnalysisSchema, {
    name: 'profile_analysis',
    includeRaw: false,
  });

  const postsText = allPosts.map(p => JSON.stringify(p)).join('\n');

  logger.info('profileAnalyzer: invoking LLM for structured analysis', { postCount: allPosts.length });

  const response = await structuredModel.invoke([
    new HumanMessage({ content: systemPrompt }),
    new HumanMessage({ content: `Here are the posts to analyze:\n${postsText}` }),
  ]) as z.infer<typeof ProfileAnalysisSchema>;

  logger.info('profileAnalyzer: analysis complete', { tone: response.tone, insightCount: response.audienceInsights.length });

  return response;
}

export async function profileAnalyzerNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('profileAnalyzerNode: starting analysis', { connectedAccountCount: state.connectedAccounts.length });
  const analysis = await fetchAndAnalyzePosts(state.connectedAccounts, logger);

  return {
    profileAnalysis: analysis as unknown as Record<string, unknown>,
    currentStep: 'define_audience',
    uiComponent: {
      type: 'ProfileSummaryCard',
      props: {
        tone: analysis.tone,
        postTypes: analysis.postTypes,
        imageAnalysis: analysis.imageAnalysis,
        audienceInsights: analysis.audienceInsights,
      },
    },
  };
}
