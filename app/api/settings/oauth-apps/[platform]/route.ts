import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteUserCredentials } from '@/lib/oauth/credentials';
import { logger } from '@/lib/logger';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await params;
    const userId = session.user.id ?? '';

    if (!platform) {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    log.info('settings.oauth_apps.delete_start', { userId, platform });

    const result = await deleteUserCredentials(userId, platform);

    if (!result.success) {
      log.error('settings.oauth_apps.delete_failed', { userId, platform, error: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info('settings.oauth_apps.delete_success', { userId, platform });
    return NextResponse.json({ success: true, platform });
  } catch (err) {
    logger.error('settings.oauth_apps.delete_exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to delete OAuth app credentials' }, { status: 500 });
  }
}
