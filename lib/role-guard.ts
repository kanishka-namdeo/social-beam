import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FEATURE_FLAGS } from './feature-gates';
import type { SubscriptionTier } from './feature-gates';

export type UserRole = 'ADMIN' | 'FREE_USER' | 'PREMIUM_USER';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  PREMIUM_USER: 2,
  FREE_USER: 1,
};

export async function getUserRole(): Promise<UserRole | null> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'ADMIN';
}

export async function isPremium(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'PREMIUM_USER' || role === 'ADMIN';
}

export async function hasRole(minimumRole: UserRole): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

export async function requireRole(role: UserRole): Promise<boolean> {
  const meetsRequirement = await hasRole(role);
  return meetsRequirement;
}

export function canAccessFeature(featureName: string, role: UserRole, userTier?: SubscriptionTier): boolean {
  const flag = FEATURE_FLAGS[featureName as keyof typeof FEATURE_FLAGS];
  if (!flag) return true;
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[flag.minRole]) return false;
  if (flag.minTier && userTier && userTier !== 'AI_PRO' && flag.minTier === 'AI_PRO') return false;
  return true;
}

export async function checkSubscriptionRole(userId: string): Promise<UserRole | null> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!sub) return null;
  if (sub.status === 'active' && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) {
    return 'PREMIUM_USER';
  }
  return 'FREE_USER';
}

export async function resolveUserRole(userId: string): Promise<UserRole> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, Subscription: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return 'FREE_USER';

  if (user.role === 'PREMIUM_USER') {
    const sub = user.Subscription;
    if (!sub || sub.status !== 'active' || !sub.currentPeriodEnd || sub.currentPeriodEnd <= new Date()) {
      await prisma.user.update({ where: { id: userId }, data: { role: 'FREE_USER', lastRoleChangeAt: new Date() } });
      return 'FREE_USER';
    }
    return 'PREMIUM_USER';
  }

  if (user.Subscription && user.Subscription.status === 'active' && user.Subscription.currentPeriodEnd && user.Subscription.currentPeriodEnd > new Date()) {
    await prisma.user.update({ where: { id: userId }, data: { role: 'PREMIUM_USER', lastRoleChangeAt: new Date() } });
    return 'PREMIUM_USER';
  }

  return user.role;
}
