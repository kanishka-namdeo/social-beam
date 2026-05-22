import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { initiateOauthTool } from '@/lib/agent/tools/social-tools';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = (await req.json()) as { platform?: string };
    if (!platform) {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    const userId = session.user.id ?? '';
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    const result = await initiateOauthTool.invoke({ platform, userId, workspaceId, redirectTo: 'settings' });
    const parsed = JSON.parse(result as string) as Record<string, unknown>;

    if (parsed.error) {
      log.warn('settings.oauth.initiate.error', { platform, error: parsed.error });
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    log.info('settings.oauth.initiate.success', { platform });
    return NextResponse.json({ authUrl: parsed.authUrl, platform: parsed.platform });
  } catch (err) {
    logger.error('settings.oauth.initiate.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
  }
}
