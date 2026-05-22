import { ChatOpenAI } from '@langchain/openai';
import { interrupt } from '@langchain/langgraph';
import { type OnboardingStateType } from '../state';
import { HumanMessage } from '@langchain/core/messages';
import { createLogger } from '../logging';

const model = new ChatOpenAI({
  apiKey: process.env.API_KEY,
  configuration: { baseURL: process.env.BASE_URL },
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.7,
  streaming: true,
});

const onboardingFormFields = [
  { name: 'name', label: 'Your Name', type: 'text' as const, placeholder: 'e.g. Alex Chen' },
  { name: 'business_type', label: 'Business Type', type: 'select' as const, options: ['Solo Creator', 'Small Business', 'Agency', 'Enterprise'] },
  { name: 'industry', label: 'Industry / Niche', type: 'text' as const, placeholder: 'e.g. Specialty coffee, SaaS, fitness' },
];

const systemPrompt = `You are SocialBeam's onboarding assistant. Your job is to collect user information through a conversational chat interface.

Current step: Collect User Information

CRITICAL: You MUST collect user information FIRST before generating any sample content, examples, or posts. Even if the user says "Plan a week of posts" or similar content requests, acknowledge their goal but explain you need to understand their business first so the content is relevant to THEM.

The user will see a form to fill out. After they submit it, use their responses to personalize their experience.

Ask the user about:
1. Their name
2. Business type (Solo Creator, Small Business, Agency, Enterprise)
3. Industry/niche

DO NOT generate sample posts, content ideas, or examples until after the user has provided their information. If the user asks for content, say you will help with that next — but first you need to know who they are.

Be conversational and friendly. Ask one or two questions at a time.
After collecting the information, acknowledge what you've learned and indicate we're moving to the next step: connecting their social media accounts.`;

const resumePrompt = `You are SocialBeam's onboarding assistant. The user has just submitted their information via a form.

Acknowledge their responses conversationally. Reference their name if provided. Summarize what you understood (using natural language, not raw field names). Then let them know you're moving to the next step: connecting their social media accounts.

Be warm and encouraging. Do NOT ask for more information — their form submission is complete. Do NOT re-render the form or ask them to fill anything out again. Just acknowledge and transition to the next step.`;

/**
 * Check if user has already submitted their info by looking for "my info:" in user messages.
 */
function hasUserSubmittedInfo(messages: unknown[]): boolean {
  for (const m of messages) {
    const msg = m as Record<string, unknown>;
    // Get content from various possible locations
    let content = '';
    if (typeof msg?.content === 'string') content = msg.content;
    else if (typeof msg?.text === 'string') content = msg.text;
    else if (msg?.kwargs && typeof (msg.kwargs as Record<string, unknown>).content === 'string') {
      content = (msg.kwargs as Record<string, unknown>).content as string;
    }
    if (content.toLowerCase().includes('my info:')) return true;
  }
  return false;
}

/** Generates an AI response and emits an onboarding form UI. */
export async function userInfoCollectorNode(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  // If userInfo already exists, skip the form and advance
  if (Object.keys(state.userInfo || {}).length > 0) {
    logger.info('userInfoCollector: data already exists, skipping', { userId: state.userId });
    return {
      currentStep: 'connect_accounts',
      uiComponent: null,
    };
  }

  // Check if user has already submitted their info
  const isResuming = hasUserSubmittedInfo(state.messages as unknown[]);
  const userInfoKeys = Object.keys(state.userInfo ?? {});
  const hasUserInfo = userInfoKeys.length > 0;

  logger.info('userInfoCollectorNode: checking state', {
    isResuming,
    hasUserInfo,
    userInfoKeys,
    messageCount: state.messages.length,
  });

  // Skip form if user has already submitted info (either via message detection or state)
  if (isResuming || hasUserInfo) {
    logger.info('userInfoCollectorNode: resuming after form submit, skipping form UI');

    const response = await model.invoke([
      new HumanMessage({ content: resumePrompt }),
      ...state.messages,
    ]);

    logger.info('userInfoCollectorNode: LLM resume response received', { responseLength: typeof response.content === 'string' ? response.content.length : 0 });

    return {
      messages: [response],
      // Clear any existing uiComponent to prevent old form from showing
      uiComponent: null,
      // Advance to the next step so the graph doesn't loop back to userInfoCollectorWait
      currentStep: 'connect_accounts',
    };
  }

  logger.info('userInfoCollectorNode: invoking LLM with form', { messageCount: state.messages.length });

  const response = await model.invoke([
    new HumanMessage({ content: systemPrompt }),
    ...state.messages,
  ]);

  logger.info('userInfoCollectorNode: LLM response received', { responseLength: typeof response.content === 'string' ? response.content.length : 0 });

  return {
    messages: [response],
    uiComponent: {
      type: 'OnboardingForm',
      props: {
        title: 'Tell us about yourself',
        formName: 'user_info',
        fields: onboardingFormFields,
      },
    },
  };
}

/**
 * Parse form submission text like "My info: name: Alex, business_type: Solo Creator, ..."
 * into a structured object.
 */
function parseUserInfo(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Remove "My info:" prefix and parse key: value pairs
  const content = text.replace(/^My info:\s*/i, '');
  // Split by comma or newline, then parse key: value
  const pairs = content.split(/[,\n]/);
  for (const pair of pairs) {
    const match = pair.match(/^\s*([^:]+):\s*(.+?)\s*$/);
    if (match) {
      const [, key, value] = match;
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

/** Pauses for user input via interrupt(). Re-runs on resume. */
export async function userInfoCollectorWait(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  // If userInfoCollectorNode already advanced the step (form was submitted),
  // skip the interrupt and let the flow return to the orchestrator.
  if (state.currentStep !== 'collect_info') {
    logger.info('userInfoCollectorWait: step already advanced, skipping interrupt', {
      currentStep: state.currentStep,
    });
    return {};
  }

  logger.info('userInfoCollectorWait: waiting for user input');

  const userReply = interrupt({
    step: 'collect_info',
    question: 'collecting user info',
  }) as string;

  logger.info('userInfoCollectorWait: user reply received', { replyLength: userReply.length });

  // Parse user info from the reply if it looks like a form submission
  const userInfo = userReply.toLowerCase().startsWith('my info:')
    ? parseUserInfo(userReply)
    : {};

  logger.info('userInfoCollectorWait: parsed user info', { userInfoKeys: Object.keys(userInfo) });

  return {
    messages: [new HumanMessage(userReply)],
    userInfo,
    currentStep: 'connect_accounts',
  };
}
