import { ChatOpenAI } from '@langchain/openai';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { interrupt } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { type OnboardingStateType } from '../state';
import { initiateOauthTool, completeOauthTool, listConnectedPlatformsTool } from '../tools/social-tools';
import { createLogger } from '../logging';

const ALL_PLATFORMS = ['linkedin', 'x', 'instagram', 'facebook', 'tiktok', 'pinterest'] as const;

const model = new ChatOpenAI({
  apiKey: process.env.API_KEY,
  configuration: { baseURL: process.env.BASE_URL },
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.3,
}).bindTools([initiateOauthTool, completeOauthTool, listConnectedPlatformsTool]);

export const accountConnectorTools = new ToolNode([
  initiateOauthTool,
  completeOauthTool,
  listConnectedPlatformsTool,
]);

function buildSystemPrompt(state: OnboardingStateType): string {
  const connectedList = state.connectedAccounts.filter(a => a.status === 'connected').map(a => a.platform).join(', ') || 'none';

  return `You are SocialBeam's account connection assistant.

Current step: Connect Social Media Accounts
User ID: ${state.userId ?? 'unknown'}
Workspace ID: ${state.workspaceId ?? 'unknown'}
Currently connected: ${connectedList}

Guide the user through connecting their social media accounts one at a time.
Available platforms: LinkedIn, X/Twitter, Instagram, Facebook, TikTok, Pinterest.

IMPORTANT: When calling tools, always include the userId and workspaceId fields with the values above.

Use the initiate_oauth tool (with userId and workspaceId) to generate OAuth URLs for the platform the user wants to connect.
Use the list_connected_platforms tool (with workspaceId) to refresh connection status if the user asks.
Use the complete_oauth tool (with userId, workspaceId, and code) when a user returns with an authorization code.

DO NOT output JSON or component descriptors in your response — the UI handles rendering connect cards automatically.
Just speak conversationally about which platform to connect next and why it matters.

For a SaaS solo creator, recommend prioritizing LinkedIn and X/Twitter first (B2B networking, thought leadership).
For a visual brand, recommend Instagram first (visual storytelling, personal brand).

Be concise — one or two sentences per platform recommendation. Move on after the user connects or declines.
If the user says they've connected an account, confirm and offer the next platform.
If all platforms are connected or the user declines, transition to the next step (profile analysis).`;
}

/** Builds a uiComponents array with all platforms and their connection status. */
function buildAccountCards(state: OnboardingStateType): Array<{ type: string; props: Record<string, unknown> }> {
  const connectedMap = new Map<string, string>();
  for (const account of state.connectedAccounts) {
    connectedMap.set(account.platform.toLowerCase(), account.status);
  }

  return ALL_PLATFORMS.map(platform => ({
    type: 'AccountConnectionCard',
    props: {
      platform,
      status: connectedMap.get(platform) === 'connected' ? 'connected' : 'disconnected' as string,
    },
  }));
}

/** Generates an AI response. Returns with tool calls if the LLM wants to invoke tools. */
export async function accountConnectorModel(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('accountConnectorModel: invoking LLM with tools', { messageCount: state.messages.length });

  const response = await model.invoke([
    new HumanMessage({ content: buildSystemPrompt(state) }),
    ...state.messages,
  ]);

  const hasToolCalls = Array.isArray(response.tool_calls) && response.tool_calls.length > 0;
  logger.info('accountConnectorModel: LLM response received', {
    hasToolCalls,
    toolCallCount: hasToolCalls ? (response.tool_calls ?? []).length : 0,
  });

  // If we already have messages beyond the system prompt, the LLM is in the tool loop —
  // don't override uiComponents on every tool-call round trip.
  const priorAssistantMsgs = state.messages.filter(
    m => (m as unknown as Record<string, unknown>).content && (m as unknown as Record<string, unknown>).role !== 'human'
  );
  if (priorAssistantMsgs.length === 0) {
    return {
      messages: [response],
      uiComponents: buildAccountCards(state),
    };
  }

  return { messages: [response] };
}

/** Pauses for user input via interrupt(). Re-runs on resume. Only reached after the tool loop finishes. */
export async function accountConnectorWait(state: OnboardingStateType): Promise<Partial<OnboardingStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('accountConnectorWait: waiting for user input');

  const userReply = interrupt({
    step: 'connect_accounts',
    question: 'connecting accounts',
  }) as string;

  logger.info('accountConnectorWait: user reply received', { replyLength: userReply.length });

  return {
    messages: [new HumanMessage(userReply)],
    currentStep: 'analyze_profile',
  };
}
