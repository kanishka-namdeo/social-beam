'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle } from '@phosphor-icons/react/ssr';
import { AccountCard } from './components/account-card';
import { ConnectDialog } from './components/connect-dialog';
import { DisconnectDialog } from './components/disconnect-dialog';
import { LinkedInUnifiedDialog } from './components/linkedin-unified-dialog';
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
  sessionCookie?: string | null;
  cookieExpiry?: Date | null;
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
  const [linkedinUnifiedOpen, setLinkedinUnifiedOpen] = useState(false);
  const [linkedinHasOAuth, setLinkedinHasOAuth] = useState(false);

  useEffect(() => {
    if (oauthStatus?.status === 'success') {
      const platformName = PLATFORM_DISPLAY_NAMES[oauthStatus.platform ?? ''] ?? oauthStatus.platform;
      toast.success('Account connected', { description: `${platformName} has been connected to your workspace.` });

      // After LinkedIn OAuth, automatically prompt for session cookie
      if (oauthStatus.platform === 'linkedin') {
        setLinkedinHasOAuth(true);
        setLinkedinUnifiedOpen(true);
      }
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
        <Alert variant="success">
          <CheckCircle className="size-4" weight="fill" />
          <AlertTitle>Connected Successfully</AlertTitle>
          <AlertDescription>
            {PLATFORM_DISPLAY_NAMES[oauthStatus.platform]} has been connected to your workspace.
          </AlertDescription>
        </Alert>
      )}

      {oauthStatus?.status === 'error' && (
        <Alert variant="destructive">
          <XCircle className="size-4" weight="fill" />
          <AlertTitle>Connection Failed</AlertTitle>
          <AlertDescription>
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
                onConnectSession={() => {
                  setLinkedinHasOAuth(true);
                  setLinkedinUnifiedOpen(true);
                }}
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

      <LinkedInUnifiedDialog
        open={linkedinUnifiedOpen}
        onOpenChange={setLinkedinUnifiedOpen}
        onComplete={() => {
          setLinkedinUnifiedOpen(false);
          window.location.reload();
        }}
        hasOAuthConnected={linkedinHasOAuth}
      />
    </div>
  );
}
