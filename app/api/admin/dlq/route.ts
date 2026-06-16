import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  listDLQEntries,
  getDLQCount,
  getDLQEntry,
  getDLQSummary,
  scheduleDLQRetry,
  removeFromDLQ,
  purgeOldDLQEntries,
} from '@/lib/dead-letter-queue';
import { logger } from '@/lib/logger';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return session;
}

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id');

    // Single entry lookup
    if (id) {
      const entry = await getDLQEntry(id);
      if (!entry) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ entry });
    }

    // Summary view
    if (action === 'summary') {
      const summary = await getDLQSummary();
      return NextResponse.json(summary);
    }

    // List view with optional filters
    const entityType = url.searchParams.get('entityType') || undefined;
    const status = url.searchParams.get('status') as 'pending' | 'retrying' | 'exhausted' | undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const entries = await listDLQEntries({ entityType, status, limit, offset });
    const total = await getDLQCount(entityType ? { entityType } : undefined);

    return NextResponse.json({ entries, total, limit, offset });
  } catch (error) {
    logger.error('admin.dlq.list_error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, id, delayMs, daysOld } = body;

    switch (action) {
      case 'retry':
        if (!id) {
          return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }
        const retried = await scheduleDLQRetry(id, delayMs);
        return NextResponse.json({ retried });

      case 'remove':
        if (!id) {
          return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }
        const removed = await removeFromDLQ(id);
        return NextResponse.json({ removed });

      case 'purge':
        const purged = await purgeOldDLQEntries(daysOld || 30);
        return NextResponse.json({ purged });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    logger.error('admin.dlq.action_error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
