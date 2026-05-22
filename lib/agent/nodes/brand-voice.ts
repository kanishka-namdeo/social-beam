import { ChatOpenAI } from '@langchain/openai';
import { interrupt } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { type OnboardingStateType } from '../state';
import { saveBrandVoiceTool, getBrandVoiceTool, previewBrandVoiceTool } from '../tools/brand-voice-tools';
import { createLogger } from '../logging';

const model = new ChatOpenAI({
  apiKey: process.env.API_KEY,
  configuration: { baseURL: process.env.BASE_URL },
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.5,
}).bindTools([saveBrandVoiceTool, getBrandVoiceTool, previewBrandVoiceTool]);

function buildSystemPrompt(state: { workspaceId?: string }): string {
  return `You are SocialBeam's brand voice training assistant.

Current step: Train Your Brand Voice (Optional)

Brand voice training makes AI-generated content sound like YOU, not a generic bot.
This step is OPTIONAL — the user can skip it and come back later.

Offer these training options (user can choose one or more):
1. **Describe your voice**: Choose from presets (Professional, Casual, Witty, Educational, Inspirational, Bold) or describe freely
2. **Provide examples**: Paste 3-5 posts that represent "exactly how we write"
3. **Upload brand guidelines**: Paste brand voice documents or do/don't lists

Be conversational — guide the user through one option at a time.
If the user says "skip", "not now", or "later", acknowledge and move on to completion.

When training is done or user skips, use save_brand_voice tool to persist the profile.

IMPORTANT: Check for existing profile first with get_brand_voice. If one exists, show it and ask if they want to update.

Workspace ID: ${state.workspaceId ?? 'unknown'}`;
}

/** Generates an AI response and saves it to state. */
export async function brandVoiceNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  // If brandVoiceProfile already exists, skip and advance
  if (state.brandVoiceProfile != null) {
    logger.info('brandVoice: data already exists, skipping', { userId: state.userId });
    return {
      currentStep: 'completion',
      messages: [new AIMessage("Your brand voice is already set up. Let's finish up!")],
      uiComponent: null,
    };
  }

  logger.info('brandVoiceNode: invoking LLM with brand voice tools', { messageCount: state.messages.length });

  const response = await model.invoke([
    new HumanMessage({ content: buildSystemPrompt(state) }),
    ...state.messages,
  ]);

  logger.info('brandVoiceNode: LLM response received', {
    hasToolCalls: Array.isArray(response.tool_calls) && response.tool_calls.length > 0,
    toolCallCount: Array.isArray(response.tool_calls) ? response.tool_calls.length : 0,
  });

  // When brand voice profile exists in state, emit a preview card
  if (state.brandVoiceProfile) {
    const bv = state.brandVoiceProfile as Record<string, unknown>;
    const samplePosts = (bv.samplePosts as Array<{ platform: string; content: string }>) ?? [];
    if (samplePosts.length > 0) {
      return {
        messages: [response],
        uiComponent: {
          type: 'BrandVoicePreview',
          props: {
            samplePosts,
            voiceDescription: (bv.voiceDescription as string) ?? undefined,
          },
        },
      };
    }
  }

  return { messages: [response] };
}

/** Pauses for user input via interrupt(). Re-runs on resume. */
export async function brandVoiceWait(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('brandVoiceWait: waiting for user input');

  const userReply = interrupt({
    step: 'train_brand_voice',
    question: 'training brand voice',
  }) as string;

  logger.info('brandVoiceWait: user reply received', { replyLength: userReply.length });

  // Check for user skip/done intent
  const userSaidDone = /skip|not now|later|done|finish/i.test(userReply);
  if (userSaidDone) {
    logger.info('brandVoiceWait: user skipped or completed brand voice training');
    return {
      messages: [new HumanMessage(userReply)],
      currentStep: 'completion',
    };
  }

  // Check if brand voice was already saved in the previous node run
  const hasBrandVoiceProfile = state.brandVoiceProfile !== null && Object.keys(state.brandVoiceProfile ?? {}).length > 0;

  // Also check if the last AI message indicates transition
  const lastAssistantMsg = state.messages[state.messages.length - 1];
  const assistantContent = typeof lastAssistantMsg?.content === 'string' ? lastAssistantMsg.content.toLowerCase() : '';
  const isTransitioningToCompletion = assistantContent.includes('all set') ||
    assistantContent.includes('we\'re done') ||
    assistantContent.includes('finish') ||
    assistantContent.includes('complete');

  const shouldAdvance = hasBrandVoiceProfile || isTransitioningToCompletion;

  logger.info('brandVoiceWait: evaluating transition', {
    hasBrandVoiceProfile,
    isTransitioningToCompletion,
    shouldAdvance,
  });

  if (shouldAdvance) {
    logger.info('brandVoiceWait: advancing to completion');
    return {
      messages: [new HumanMessage(userReply)],
      currentStep: 'completion',
    };
  }

  // Stay in train_brand_voice step for multi-turn training
  logger.info('brandVoiceWait: staying in train_brand_voice step');
  return {
    messages: [new HumanMessage(userReply)],
  };
}
