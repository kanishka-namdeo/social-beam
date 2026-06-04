import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const adminUser = session?.user as { id?: string; role?: string } | undefined;

    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify admin role from DB
    const adminDb = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { role: true, email: true },
    });
    if (!adminDb || adminDb.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body as { userId: string; role: string };

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['FREE_USER', 'PREMIUM_USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent removing the last admin
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (adminCount <= 1 && targetUser?.role === 'ADMIN') {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as 'ADMIN' | 'FREE_USER' | 'PREMIUM_USER', lastRoleChangeAt: new Date() },
    });

    log.info('admin.role_changed', { adminId: adminUser.id, targetUserId: userId, newRole: role });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('admin.role.error', { requestId, error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
