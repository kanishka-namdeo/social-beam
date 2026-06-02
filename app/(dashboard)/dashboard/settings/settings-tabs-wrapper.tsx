'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountsTab } from './accounts-tab';
import { BrandVoiceTab } from './brand-voice-tab';
import { DeveloperAppsTab } from './developer-apps-tab';
import { AiSettingsTab } from './ai-settings-tab';

interface OauthStatus {
  status: 'success' | 'error';
  platform?: string;
  reason?: string;
}

interface SettingsTabsWrapperProps {
  initialTab: string;
  connectedAccounts: Array<{
    id: string;
    platform: string;
    status: string;
    createdAt: Date;
    platformUsername?: string | null;
    avatarUrl?: string | null;
    followerCount?: number | null;
    tokenExpiry?: Date | null;
    lastRefreshAt?: Date | null;
    lastSyncedAt?: Date | null;
  }>;
  oauthStatus?: OauthStatus;
  developerApps: Array<{
    platform: string;
    isConfigured: boolean;
    hasClientId: boolean;
    hasSecret: boolean;
  }>;
}

export function SettingsTabsWrapper({ initialTab, connectedAccounts, oauthStatus, developerApps }: SettingsTabsWrapperProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // OAuth status is handled downstream in AccountsTab via inline alerts + sonner toast

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, connected platforms, and preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10 gap-0 bg-transparent p-0 border-b border-border">
          <TabsTrigger value="accounts" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Accounts</TabsTrigger>
          <TabsTrigger value="developer" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Developer Apps</TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">Brand Voice</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:border-b-2 data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-brand rounded-sm border-b-2 border-transparent transition-all">AI Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountsTab connectedAccounts={connectedAccounts} oauthStatus={oauthStatus} />
        </TabsContent>

        <TabsContent value="developer">
          <DeveloperAppsTab initialApps={developerApps} />
        </TabsContent>

        <TabsContent value="brand">
          <BrandVoiceTab />
        </TabsContent>

        <TabsContent value="ai">
          <AiSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
