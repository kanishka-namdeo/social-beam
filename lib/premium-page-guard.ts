import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROLE_HIERARCHY, checkSubscriptionRole } from '@/lib/role-guard';

export async function requirePremiumOrRedirect(): Promise<void> {
  const session = await auth();
  const sessionRole = (session?.user as { role?: string })?.role ?? 'FREE_USER';
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  if (ROLE_HIERARCHY[sessionRole as keyof typeof ROLE_HIERARCHY] < ROLE_HIERARCHY['PREMIUM_USER']) {
    if (sessionUserId) {
      const dbRole = await checkSubscriptionRole(sessionUserId);
      if (dbRole === 'PREMIUM_USER') {
        return;
      }
    }
    redirect('/billing?reason=premium_required');
  }
}
