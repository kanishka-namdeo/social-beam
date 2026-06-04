import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ROLE_HIERARCHY, checkSubscriptionRole, type UserRole } from '@/lib/role-guard';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function requirePremium(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionRole = (session.user as { role?: UserRole })?.role;

  // Fast path: check session role first
  if (sessionRole && ROLE_HIERARCHY[sessionRole as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY['PREMIUM_USER']) {
    return null;
  }

  // Fallback: check DB subscription (handles stale session after Stripe upgrade)
  const userId = (session.user as { id?: string }).id;
  if (userId) {
    const dbRole = await checkSubscriptionRole(userId);
    if (dbRole === 'PREMIUM_USER') {
      return null;
    }
  }

  logger.warn('api.guard.premium_required', { userId });
  return NextResponse.json(
    { error: 'This feature requires a Premium subscription', feature: 'premium_required' },
    { status: 403 },
  );
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (dbUser?.role !== 'ADMIN') {
    logger.warn('api.guard.admin_required', { userId });
    return NextResponse.json(
      { error: 'This action requires admin access', feature: 'admin_required' },
      { status: 403 },
    );
  }

  return null;
}
