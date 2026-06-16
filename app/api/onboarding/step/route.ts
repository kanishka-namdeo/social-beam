import { z } from 'zod';
import { auth } from '@/lib/auth';
import { saveStepData } from '@/lib/db/onboarding';
import type { Session } from 'next-auth';

const stepSchema = z.object({
  step: z.enum(['about_you', 'connect_accounts', 'brand_voice', 'first_post']),
  data: z.record(z.unknown()),
});

const STEP_TO_SAVE_STEP: Record<string, string> = {
  about_you: 'collect_info',
  brand_voice: 'train_brand_voice',
};

export async function POST(req: Request) {
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
      return new Response(JSON.stringify({ error: 'No workspace found for user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const parsed = stepSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { step, data } = parsed.data;
    const saveStepName = STEP_TO_SAVE_STEP[step];

    if (saveStepName) {
      await saveStepData(saveStepName, workspaceId, data);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
