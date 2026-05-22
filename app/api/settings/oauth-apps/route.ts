import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listUserOAuthApps, upsertUserCredentials } from '@/lib/oauth/credentials';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id ?? '';
  const apps = await listUserOAuthApps(userId);

  return NextResponse.json({ platforms: apps });
}

const saveSchema = z.object({
  platform: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id ?? '';
    const body = await req.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platform, clientId, clientSecret } = parsed.data;

    log.info('settings.oauth_apps.save_start', { userId, platform });

    const result = await upsertUserCredentials(userId, platform, clientId, clientSecret);

    if (!result.success) {
      log.error('settings.oauth_apps.save_failed', { userId, platform, error: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('settings.oauth_apps.save_success', { userId, platform });
    return NextResponse.json({ success: true, platform });
  } catch (err) {
    logger.error('settings.oauth_apps.save_exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to save OAuth app credentials' }, { status: 500 });
  }
}
