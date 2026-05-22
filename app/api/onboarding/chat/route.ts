import { auth } from '@/lib/auth';
import { onboardingGraphPromise } from '@/lib/agent/graph';
import { createLogger } from '@/lib/agent/logging';
import { saveStepData, updateSessionStep, markSessionComplete, getExistingOnboardingData, getNextIncompleteStep } from '@/lib/db/onboarding';
import { GraphInterrupt } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { Session } from 'next-auth';

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const typedSession = session as Session;
    const userId = typedSession.user.id ?? '';
    const workspaceId = typedSession.user.workspaceId ?? '';

    const logger = createLogger({ correlationId, userId });
    logger.info('onboarding.session.start', { sessionId: `${userId}-${correlationId}` });

    const body = await req.json();
    const { message, messages: previousMessages } = body as {
      message: string;
      messages: Array<{ role: string; content: string }>;
    };

    // Load existing onboarding data to check if we should resume
    let existingData: import('@/lib/db/onboarding').ExistingOnboardingData | null = null;
    let nextStep = 'greeting';
    let hasExistingData = false;

    if (workspaceId) {
      try {
        existingData = await getExistingOnboardingData(workspaceId);
        nextStep = getNextIncompleteStep(existingData.completedSteps);
        hasExistingData = existingData.completedSteps.length > 0;

        if (hasExistingData) {
          logger.info('chat.route: found existing onboarding data', {
            userId,
            completedSteps: existingData.completedSteps,
            nextStep,
          });
        }
      } catch (error) {
        logger.error('chat.route: failed to load existing data', { error: String(error) });
        // Continue with fresh start
      }
    }

    const langchainMessages: (HumanMessage | AIMessage)[] = [];

    for (const msg of previousMessages ?? []) {
      if (msg.role === 'user') {
        langchainMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        langchainMessages.push(new AIMessage(msg.content));
      }
    }

    langchainMessages.push(new HumanMessage(message));

    const sessionId = `${userId}-${correlationId}`;

    const input: Record<string, unknown> = {
      messages: langchainMessages,
      userId,
      workspaceId,
      correlationId,
    };

    // Include existing data in the input so the agent can resume properly
    if (hasExistingData && existingData) {
      input.userInfo = existingData.userInfo ?? {};
      input.audienceProfile = existingData.audienceProfile;
      input.profileAnalysis = existingData.profileAnalysis;
      input.brandVoiceProfile = existingData.brandVoiceProfile;
      input.hasExistingData = true;
      input.currentStep = nextStep;
      logger.info('chat.route: resuming with existing data', { nextStep });
    }

    const encoder = new TextEncoder();
    const graph = await onboardingGraphPromise;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const eventStream = graph.streamEvents(input, {
            version: 'v2',
            configurable: { thread_id: sessionId },
          });

          for await (const event of eventStream) {
            const eventType = event.event;
            const eventData = event.data as Record<string, unknown>;

            if (eventType === 'on_chat_model_stream') {
              const chunk = eventData.chunk as Record<string, unknown> | undefined;
              const token = chunk?.content ?? '';
              if (token) {
                const data = `data: ${JSON.stringify({ content: token })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }

            if (eventType === 'on_chain_end') {
              const output = eventData.output as Record<string, unknown> | undefined;
              if (output?.currentStep) {
                logger.info('onboarding.stream.event', { node: output.currentStep });
                const stepData = `data: ${JSON.stringify({ step: output.currentStep })}\n\n`;
                controller.enqueue(encoder.encode(stepData));
              }
              if (output?.completed) {
                logger.info('onboarding.stream.complete');
                const data = `data: ${JSON.stringify({ completed: true })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
              if (output?.uiComponent) {
                const uiData = `data: ${JSON.stringify({ uiComponent: output.uiComponent })}\n\n`;
                controller.enqueue(encoder.encode(uiData));
              }
              if (output?.uiComponents && Array.isArray(output.uiComponents) && output.uiComponents.length > 0) {
                const uiData = `data: ${JSON.stringify({ uiComponents: output.uiComponents })}\n\n`;
                controller.enqueue(encoder.encode(uiData));
              }
            }
          }

          // Check if graph paused at interrupt
          const finalState = await graph.getState({ configurable: { thread_id: sessionId } });
          const stateValues = finalState.values as Record<string, unknown>;

          // Detect interrupt by checking if the next pending node is __interrupt__
          const nextNodes = finalState.next as string[] | undefined;
          const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes('__interrupt__');
          if (isInterrupted && !stateValues?.completed) {
            logger.info('onboarding.stream.interrupted', { threadId: sessionId });
            const data = `data: ${JSON.stringify({ interrupted: true, threadId: sessionId })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          if (stateValues?.completed) {
            logger.info('onboarding.stream.complete');
            const data = `data: ${JSON.stringify({ completed: true })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          logger.info('onboarding.stream.done', { correlationId });

          const doneData = `data: ${JSON.stringify({ done: true, correlationId, threadId: sessionId })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();

          // Save collected data to database after stream completes
          try {
            const currentStep = stateValues?.currentStep as string | undefined;
            const userInfo = stateValues?.userInfo as Record<string, unknown> | undefined;
            const audienceProfile = stateValues?.audienceProfile as Record<string, unknown> | undefined;
            const profileAnalysis = stateValues?.profileAnalysis as Record<string, unknown> | undefined;
            const brandVoiceProfile = stateValues?.brandVoiceProfile as Record<string, unknown> | undefined;
            const completed = stateValues?.completed as boolean | undefined;

            // Save step-specific data based on current step
            if (currentStep === 'collect_info' && userInfo && Object.keys(userInfo).length > 0) {
              await saveStepData('collect_info', workspaceId, userInfo);
            }

            if (currentStep === 'define_audience' && audienceProfile) {
              await saveStepData('define_audience', workspaceId, { audienceProfile });
            }

            if (currentStep === 'analyze_profile' && profileAnalysis) {
              await saveStepData('analyze_profile', workspaceId, profileAnalysis);
            }

            if (currentStep === 'train_brand_voice' && brandVoiceProfile) {
              await saveStepData('train_brand_voice', workspaceId, brandVoiceProfile);
            }

            // Mark session as complete if onboarding is finished
            if (completed) {
              await markSessionComplete(userId);
            }

            // Always update the current step in the session
            if (currentStep) {
              await updateSessionStep(userId, currentStep);
            }
          } catch (dbError) {
            logger.error('chat.route: failed to save step data', { error: dbError, currentStep: stateValues?.currentStep, userId });
          }
        } catch (error) {
          if (error instanceof GraphInterrupt) {
            logger.info('onboarding.graphInterrupt', { threadId: sessionId });
            const finalState = await graph.getState({ configurable: { thread_id: sessionId } });
            const stateValues = finalState.values as Record<string, unknown>;
            const metadata = finalState.metadata as Record<string, unknown> | undefined;
            const writes = (metadata?.writes as unknown[]) ?? [];
            const pendingWrites = (finalState as unknown as Record<string, unknown>)?.pending_writes as unknown[] | undefined;
            const interruptPayloads = [...writes, ...(pendingWrites ?? [])]
              .filter((w: unknown) => {
                const entry = w as Record<string, unknown>;
                return entry?.type === 'interrupt';
              });

            const data = `data: ${JSON.stringify({
              interrupted: true,
              threadId: sessionId,
              interrupts: interruptPayloads,
              completed: stateValues?.completed ?? false,
            })}\n\n`;
            controller.enqueue(encoder.encode(data));

            logger.info('onboarding.stream.done', { correlationId });
            const doneData = `data: ${JSON.stringify({ done: true, correlationId, threadId: sessionId })}\n\n`;
            controller.enqueue(encoder.encode(doneData));
            controller.close();
          } else {
            logger.error('Stream error', { error: String(error) });
            const errorData = `data: ${JSON.stringify({ error: 'Stream failed', correlationId })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
