'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { AccountCard } from './components/account-card';
import { ConnectDialog } from './components/connect-dialog';
import { DisconnectDialog } from './components/disconnect-dialog';
import { PLATFORMS, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';

interface OauthStatus {
  status: 'success' | 'error';
  platform?: string;
  reason?: string;
}

interface ConnectedAccount {
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
}

interface AccountsTabProps {
  connectedAccounts: ConnectedAccount[];
  oauthStatus?: OauthStatus;
}

export function AccountsTab({ connectedAccounts, oauthStatus }: AccountsTabProps) {
  const [hiddenAccountIds, setHiddenAccountIds] = useState<Set<string>>(new Set());
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState<{
    id: string;
    platform: string;
  } | null>(null);

  useEffect(() => {
    if (oauthStatus?.status === 'success') {
      const platformName = PLATFORM_DISPLAY_NAMES[oauthStatus.platform ?? ''] ?? oauthStatus.platform;
      toast.success('Account connected', { description: `${platformName} has been connected to your workspace.` });
    }
  }, [oauthStatus]);

  const accounts = connectedAccounts.filter((a) => !hiddenAccountIds.has(a.id));
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  const handleDisconnectSuccess = () => {
    if (disconnectingAccount) {
      setHiddenAccountIds((prev) => new Set(prev).add(disconnectingAccount.id));
    }
    setDisconnectingAccount(null);
  };

  return (
    <div className="space-y-4">
      {oauthStatus?.status === 'success' && oauthStatus.platform && (
        <Alert className="border-success/30 bg-success/10">
          <CheckCircle className="size-4 text-success" weight="fill" />
          <AlertTitle className="text-success">Connected Successfully</AlertTitle>
          <AlertDescription className="text-success">
            {PLATFORM_DISPLAY_NAMES[oauthStatus.platform]} has been connected to your workspace.
          </AlertDescription>
        </Alert>
      )}

      {oauthStatus?.status === 'error' && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <XCircle className="size-4 text-destructive" weight="fill" />
          <AlertTitle className="text-destructive">Connection Failed</AlertTitle>
          <AlertDescription className="text-destructive">
            {oauthStatus.reason
              ? `Failed to connect: ${oauthStatus.reason}`
              : 'An error occurred while connecting your account.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const account = accounts.find((a) => a.platform === platform);
          const isConnected = account != null;
          const isNotConnected = !connectedPlatforms.has(platform);

          if (isConnected) {
            return (
              <AccountCard
                key={platform}
                account={account}
                onDisconnect={() => setDisconnectingAccount({ id: account.id, platform })}
                onReconnect={() => setConnectingPlatform(platform)}
              />
            );
          }

          if (isNotConnected) {
            return (
              <AccountCard
                key={platform}
                platform={platform}
                status="disconnected"
                onConnect={() => setConnectingPlatform(platform)}
              />
            );
          }

          return null;
        })}
      </div>

      {connectingPlatform && (
        <ConnectDialog
          open={connectingPlatform != null}
          platform={connectingPlatform}
          onClose={() => setConnectingPlatform(null)}
        />
      )}

      {disconnectingAccount && (
        <DisconnectDialog
          open={disconnectingAccount != null}
          platform={disconnectingAccount.platform}
          accountId={disconnectingAccount.id}
          onClose={() => setDisconnectingAccount(null)}
          onDisconnectSuccess={handleDisconnectSuccess}
        />
      )}
    </div>
  );
}
