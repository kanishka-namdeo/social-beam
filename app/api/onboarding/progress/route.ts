import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
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
    const workspaceId = (typedSession.user as { workspaceId?: string }).workspaceId ?? '';

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'No workspace found for user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [brandContext, connectedCount, postCount] = await Promise.all([
      prisma.brandContext.findUnique({
        where: { workspaceId },
        select: { businessName: true, tonePreset: true },
      }),
      prisma.connectedAccount.count({ where: { workspaceId } }),
      prisma.post.count({ where: { workspaceId } }),
    ]);

    const steps = {
      about_you: brandContext?.businessName != null,
      connect_accounts: connectedCount > 0,
      brand_voice: brandContext?.tonePreset != null,
      first_post: postCount > 0,
    };

    const completedCount = Object.values(steps).filter(Boolean).length;

    logger.debug('onboarding.progress', { workspaceId, steps, completedCount });

    return new Response(
      JSON.stringify({
        steps,
        completedCount,
        allComplete: completedCount === 4,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('onboarding.progress.error', { error: String(error) });
    return new Response(
      JSON.stringify({ error: 'Failed to fetch onboarding progress' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
