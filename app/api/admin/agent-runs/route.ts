import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { listActiveRuns, killAgentRun } from '@/lib/agent/kill-switch';

async function verifyAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (user?.role !== 'ADMIN') {
    return null;
  }

  const adminDb = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!adminDb || adminDb.role !== 'ADMIN') {
    return null;
  }

  return user;
}

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const runs = listActiveRuns();

    logger.info('admin.agent_runs.listed', { requestId, adminId: admin.id, runCount: runs.length });

    return NextResponse.json({ runs });
  } catch (error) {
    logger.error('admin.agent_runs.list_error', { requestId, error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json({ error: 'runId query parameter is required' }, { status: 400 });
    }

    const killed = killAgentRun(runId);

    if (!killed) {
      return NextResponse.json({ error: `Run ${runId} not found or already terminated` }, { status: 404 });
    }

    logger.info('admin.agent_runs.killed', { requestId, adminId: admin.id, runId });

    return NextResponse.json({ success: true, runId });
  } catch (error) {
    logger.error('admin.agent_runs.kill_error', { requestId, error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
