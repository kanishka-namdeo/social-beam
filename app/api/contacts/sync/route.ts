import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { syncContactsFromEngagements } from '@/lib/contacts/sync-contacts';

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    log.info('contacts.sync.start', { workspaceId });
    const count = await syncContactsFromEngagements(workspaceId);

    log.info('contacts.sync.success', { workspaceId, count });
    return NextResponse.json({ count });
  } catch (err) {
    logger.error('contacts.sync.exception', { error: String(err), requestId });
    return NextResponse.json({ error: 'Failed to sync contacts' }, { status: 500 });
  }
}
