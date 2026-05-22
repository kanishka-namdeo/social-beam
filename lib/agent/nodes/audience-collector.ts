import { ChatOpenAI } from '@langchain/openai';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { interrupt } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { type OnboardingStateType } from '../state';
import { saveAudienceTool, getAudienceTool } from '../tools/audience-tools';
import { createLogger } from '../logging';

const model = new ChatOpenAI({
  apiKey: process.env.API_KEY,
  configuration: { baseURL: process.env.BASE_URL },
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.5,
}).bindTools([saveAudienceTool, getAudienceTool]);

export const audienceCollectorTools = new ToolNode([saveAudienceTool, getAudienceTool]);

function buildSystemPrompt(state: { workspaceId?: string }): string {
  return `You are SocialBeam's audience definition assistant.

Current step: Define Your Target Audience (OPTIONAL)

Understanding the target audience is helpful for generating quality AI content. The user can skip this step and come back later.

Guide the user through defining their audience. Collect:
1. **Demographics**: Age range, location, income level
2. **Interests**: Industry topics, hobbies, professional interests
3. **Platform behavior**: Which platforms their audience uses most, when they're active
4. **Competitor awareness**: Accounts their audience follows (helps avoid duplicating competitor messaging)
5. **Pain points**: Problems the audience faces that the brand solves

Be conversational — ask 1-2 questions at a time. Don't overwhelm with a form.
If the user doesn't know something, that's fine — move on.
If the user says "skip", "not now", "later", or "don't need", acknowledge and transition to brand voice training.

IMPORTANT: When you have collected enough information (at minimum: demographics OR interests OR pain points), you MUST:
1. Call the save_audience tool to persist the profile with workspaceId: "${state.workspaceId ?? 'unknown'}"
2. After saving, explicitly tell the user you're moving to the next step: brand voice training
3. Do NOT ask additional questions after saving - transition immediately to brand voice training

If an audience already exists (check with get_audience first), show it and ask if they want to update.

Workspace ID: ${state.workspaceId ?? 'unknown'}`;
}

/** Generates an AI response and saves it to state. */
export async function audienceCollectorNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  // If audienceProfile already exists, skip collection and advance
  if (state.audienceProfile != null) {
    logger.info('audienceCollector: data already exists, skipping', { userId: state.userId });
    return {
      currentStep: 'train_brand_voice',
      messages: [new AIMessage("I've already got your audience information. Let's move on to brand voice training!")],
      uiComponent: null,
    };
  }

  logger.info('audienceCollectorNode: invoking LLM with audience tools', { messageCount: state.messages.length });

  const response = await model.invoke([
    new HumanMessage({ content: buildSystemPrompt(state) }),
    ...state.messages,
  ]);

  logger.info('audienceCollectorNode: LLM response received', {
    hasToolCalls: Array.isArray(response.tool_calls) && response.tool_calls.length > 0,
    toolCallCount: Array.isArray(response.tool_calls) ? response.tool_calls.length : 0,
  });

  // Emit AudienceSummary card when the audience profile has been saved to state
  if (state.audienceProfile) {
    const ap = state.audienceProfile as Record<string, unknown>;
    return {
      messages: [response],
      uiComponent: {
        type: 'AudienceSummary',
        props: {
          demographics: (ap.demographics as string) ?? '',
          interests: (ap.interests as string[]) ?? [],
          painPoints: (ap.painPoints as string[]) ?? [],
        },
      },
    };
  }

  return { messages: [response] };
}

/** Pauses for user input via interrupt(). Re-runs on resume. */
export async function audienceCollectorWait(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('audienceCollectorWait: waiting for user input');

  const userReply = interrupt({
    step: 'define_audience',
    question: 'collecting audience info',
  }) as string;

  logger.info('audienceCollectorWait: user reply received', { replyLength: userReply.length });

  // Check for user skip intent
  const userSaidSkip = /skip|not now|later|don't need|move on/i.test(userReply);
  if (userSaidSkip) {
    logger.info('audienceCollectorWait: user skipped audience definition');
    return {
      messages: [new HumanMessage(userReply)],
      currentStep: 'train_brand_voice',
    };
  }

  // Check if audience was saved in the previous node run (audienceCollectorNode)
  // The audienceProfile state is set when save_audience tool is called
  const hasAudienceProfile = state.audienceProfile !== null && Object.keys(state.audienceProfile ?? {}).length > 0;

  // Also check if the last AI message indicates we're moving to brand voice
  const lastAssistantMsg = state.messages[state.messages.length - 1];
  const assistantContent = typeof lastAssistantMsg?.content === 'string' ? lastAssistantMsg.content.toLowerCase() : '';
  const isTransitioningToBrandVoice = assistantContent.includes('brand voice') ||
    assistantContent.includes('train brand') ||
    assistantContent.includes('voice train');

  // Only advance to train_brand_voice if:
  // 1. We have an audience profile saved, OR
  // 2. The AI explicitly indicated we're moving to brand voice training
  const shouldAdvance = hasAudienceProfile || isTransitioningToBrandVoice;

  logger.info('audienceCollectorWait: evaluating step transition', {
    hasAudienceProfile,
    isTransitioningToBrandVoice,
    shouldAdvance,
  });

  if (shouldAdvance) {
    logger.info('audienceCollectorWait: advancing to train_brand_voice');
    return {
      messages: [new HumanMessage(userReply)],
      currentStep: 'train_brand_voice',
    };
  }

  // Stay in define_audience step - the orchestrator will route back to audienceCollector
  logger.info('audienceCollectorWait: staying in define_audience step');
  return {
    messages: [new HumanMessage(userReply)],
    // currentStep stays as define_audience (no change)
  };
}
