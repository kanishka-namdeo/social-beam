import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isOnboardingComplete } from '@/lib/db/onboarding';
import { redirect } from 'next/navigation';
import { SettingsTabsWrapper } from './settings-tabs-wrapper';
import { listUserOAuthApps } from '@/lib/oauth/credentials';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; oauth?: string; platform?: string; reason?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id ?? '';
  if (!(await isOnboardingComplete(userId))) {
    redirect('/onboarding');
  }

  const params = await searchParams;
  const activeTab = params.tab ?? 'accounts';

  const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

  const connectedAccounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
    select: {
      id: true,
      platform: true,
      status: true,
      createdAt: true,
      platformUsername: true,
      avatarUrl: true,
      followerCount: true,
      tokenExpiry: true,
      lastRefreshAt: true,
      lastSyncedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const developerApps = await listUserOAuthApps(userId);

  const oauthStatus = params.oauth ? {
    status: params.oauth as 'success' | 'error',
    platform: params.platform,
    reason: params.reason,
  } : undefined;

  return <SettingsTabsWrapper initialTab={activeTab} connectedAccounts={connectedAccounts} oauthStatus={oauthStatus} developerApps={developerApps} />;
}
