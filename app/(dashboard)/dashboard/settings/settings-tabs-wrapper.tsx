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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, connected platforms, and preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="developer">Developer Apps</TabsTrigger>
          <TabsTrigger value="brand">Brand Voice</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <AccountsTab connectedAccounts={connectedAccounts} oauthStatus={oauthStatus} />
        </TabsContent>

        <TabsContent value="developer" className="mt-6">
          <DeveloperAppsTab initialApps={developerApps} />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandVoiceTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AiSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
