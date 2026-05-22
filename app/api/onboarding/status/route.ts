import { auth } from '@/lib/auth';
import { isOnboardingComplete } from '@/lib/db/onboarding';
import { logger } from '@/lib/logger';
import type { Session } from 'next-auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const typedSession = session as Session;
    const userId = typedSession.user.id ?? '';

    const completed = await isOnboardingComplete(userId);
    logger.debug('onboarding.status.check', { userId, completed });

    return new Response(JSON.stringify({ completed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('onboarding.status.error', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'Failed to check onboarding status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
