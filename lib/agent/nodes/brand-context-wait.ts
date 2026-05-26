import { interrupt } from '@langchain/langgraph';
import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const CONFIRM_KEYWORDS = ['looks good', 'confirm', 'yes', 'approve', 'save', 'approved', 'looks great', 'perfect', 'go ahead'];

export async function contextWaitNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const logger = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });
  logger.info('contextWaitNode: entering', { currentStep: state.currentStep, userConfirmed: state.userConfirmed });

  // If userConfirmed was set by the resume invoke (save_edits action), skip interrupt and let router handle
  if (state.userConfirmed) {
    logger.info('contextWaitNode: userConfirmed from invoke payload, skipping interrupt', { userId: state.userId });
    return {
      messages: [new AIMessage('Brand context confirmed and saved.')],
      currentStep: 'done',
    };
  }

  // Interrupt guard: if currentStep already changed externally, skip interrupt
  if (state.currentStep !== 'review') {
    logger.info('contextWaitNode: step already changed externally, skipping interrupt', { currentStep: state.currentStep });
    return {};
  }

  const userReply = interrupt({
    step: 'brand_context_review',
    question: 'review generated brand context',
  }) as string;

  logger.info('contextWaitNode: user reply received', { replyLength: userReply.length, reply: userReply.slice(0, 100) });

  const lowerReply = userReply.toLowerCase();
  const isConfirmed = CONFIRM_KEYWORDS.some((keyword) => lowerReply.includes(keyword));

  if (isConfirmed) {
    logger.info('contextWaitNode: user confirmed brand context', { userId: state.userId });
    return {
      messages: [new HumanMessage(userReply)],
      userConfirmed: true,
      userFeedback: '',
      // Do NOT advance currentStep — the router decides based on userConfirmed
    };
  }

  // User wants edits or has feedback
  logger.info('contextWaitNode: user requested edits', { feedback: userReply.slice(0, 200) });
  return {
    messages: [
      new HumanMessage(userReply),
      new AIMessage(`Got it. I've noted your feedback: "${userReply}". Let me know when you're ready to re-review or describe what changes you'd like.`),
    ],
    userFeedback: userReply,
    userConfirmed: false,
    // Stay on review — the router will decide where to go next
    currentStep: 'review',
  };
}