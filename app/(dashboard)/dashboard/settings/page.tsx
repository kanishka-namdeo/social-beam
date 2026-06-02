import { redirect } from 'next/navigation';

// Redirect old /dashboard/settings route to new /settings location
// Old tab params: accounts, developer, brand, ai
// New tab params: overview, accounts, developer, ai, navigation
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; oauth?: string; platform?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const tabMap: Record<string, string> = {
    accounts: 'accounts',
    developer: 'developer',
    brand: 'overview', // Brand voice is now on /settings/brand
    ai: 'ai',
  };
  const newTab = tabMap[params.tab ?? ''] ?? 'overview';
  const search = newTab === 'overview' ? '' : `?tab=${newTab}`;
  redirect(`/settings${search}`);
}
