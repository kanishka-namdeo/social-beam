import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { initiateOauthTool } from '@/lib/agent/tools/social-tools';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = (await req.json()) as { platform?: string; redirectTo?: string };
    const { platform, redirectTo } = body;
    if (!platform) {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    const userId = session.user.id ?? '';
    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    const result = await initiateOauthTool.invoke({ platform, userId, workspaceId, redirectTo });
    const parsed = JSON.parse(result as string) as Record<string, unknown>;

    if (parsed.error) {
      logger.warn('oauth.initiate.error', { platform, error: parsed.error });
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json({ authUrl: parsed.authUrl, platform: parsed.platform });
  } catch (err) {
    logger.error('oauth.initiate.exception', { error: String(err) });
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
  }
}
