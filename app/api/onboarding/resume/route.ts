import { auth } from '@/lib/auth';
import { onboardingGraphPromise } from '@/lib/agent/graph';
import { createLogger } from '@/lib/agent/logging';
import { Command, GraphInterrupt } from '@langchain/langgraph';
import type { Session } from 'next-auth';
import {
  getExistingOnboardingData,
  getNextIncompleteStep,
  updateSessionStep,
} from '@/lib/db/onboarding';

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

    const body = await req.json();
    const { message, threadId } = body as {
      message: string;
      threadId: string;
    };

    if (!message || !threadId) {
      return new Response(
        JSON.stringify({ error: 'message and threadId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info('onboarding.resume', { threadId, messageLength: message.length });

    // Load existing onboarding data from database
    let existingData: import('@/lib/db/onboarding').ExistingOnboardingData | null = null;
    let nextStep = 'greeting';
    let hasExistingData = false;

    if (workspaceId) {
      try {
        existingData = await getExistingOnboardingData(workspaceId);
        nextStep = getNextIncompleteStep(existingData.completedSteps);
        hasExistingData = existingData.completedSteps.length > 0;

        if (hasExistingData) {
          logger.info('resume.route: loaded existing data', {
            userId,
            completedSteps: existingData.completedSteps,
            nextStep,
          });
        } else {
          logger.info('resume.route: no existing data, fresh start', { userId });
        }

        // Update session step in database
        await updateSessionStep(userId, nextStep);
      } catch (error) {
        logger.error('resume.route: failed to load existing data', { error: String(error) });
        // Continue with defaults - fresh start
      }
    }

    const graph = await onboardingGraphPromise;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build state update with existing data
          const stateUpdate: Record<string, unknown> = {
            currentStep: nextStep,
          };

          if (existingData) {
            stateUpdate.userInfo = existingData.userInfo ?? {};
            stateUpdate.audienceProfile = existingData.audienceProfile;
            stateUpdate.profileAnalysis = existingData.profileAnalysis;
            stateUpdate.brandVoiceProfile = existingData.brandVoiceProfile;
            stateUpdate.hasExistingData = hasExistingData;
          }

          // Always set hasExistingData flag if we found existing data
          if (hasExistingData) {
            stateUpdate.hasExistingData = true;
          }

          const eventStream = graph.streamEvents(
            new Command({ resume: message, update: stateUpdate }),
            {
              version: 'v2',
              configurable: { thread_id: threadId },
            }
          );

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

            if (eventType === 'on_custom_event' && event.name === 'interrupt') {
              const interruptValue = eventData as Record<string, unknown>;
              if (interruptValue?.value) {
                const data = `data: ${JSON.stringify({ interrupted: true, interrupt: interruptValue.value, threadId })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }

          // Check final state for completion or interrupt
          const finalState = await graph.getState({ configurable: { thread_id: threadId } });
          const stateValues = finalState.values as Record<string, unknown>;

          if (stateValues?.completed) {
            const data = `data: ${JSON.stringify({ completed: true })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Detect if the graph paused at another interrupt after resuming
          const nextNodes = finalState.next as string[] | undefined;
          const isInterrupted = Array.isArray(nextNodes) && nextNodes.includes('__interrupt__');
          if (isInterrupted && !stateValues?.completed) {
            logger.info('onboarding.resume.interrupted', { threadId });
            const data = `data: ${JSON.stringify({ interrupted: true, threadId })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          logger.info('onboarding.resume.done', { correlationId, threadId });

          const doneData = `data: ${JSON.stringify({ done: true, correlationId, threadId })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          if (error instanceof GraphInterrupt) {
            logger.info('onboarding.graphInterrupt', { threadId });
            const finalState = await graph.getState({ configurable: { thread_id: threadId } });
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
              threadId,
              interrupts: interruptPayloads,
              completed: stateValues?.completed ?? false,
            })}\n\n`;
            controller.enqueue(encoder.encode(data));

            logger.info('onboarding.resume.done', { correlationId, threadId });
            const doneData = `data: ${JSON.stringify({ done: true, correlationId, threadId })}\n\n`;
            controller.enqueue(encoder.encode(doneData));
            controller.close();
          } else {
            logger.error('Resume stream error', { error: String(error) });
            const errorData = `data: ${JSON.stringify({ error: 'Resume failed', correlationId })}\n\n`;
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
