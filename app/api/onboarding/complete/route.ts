import { auth } from '@/lib/auth';
import { createLogger } from '@/lib/agent/logging';
import { markSessionComplete } from '@/lib/db/onboarding';
import type { Session } from 'next-auth';

export async function POST() {
  const correlationId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const typedSession = session as Session;
    const userId = typedSession.user.id ?? '';
    const logger = createLogger({ correlationId, userId });

    logger.info('onboarding.complete', { userId });
    await markSessionComplete(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to mark onboarding complete' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
