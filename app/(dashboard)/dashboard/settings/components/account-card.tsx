'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';
import { CheckCircle, Clock, Warning } from '@phosphor-icons/react/ssr';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  connected: 'secondary',
  expired: 'secondary',
  revoked: 'destructive',
  error: 'destructive',
};

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

interface AccountCardProps {
  platform?: string;
  status?: string;
  account?: ConnectedAccount;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onConnectSession?: () => void;
}

/**
 * Format token expiry into a human-readable countdown.
 */
function getTokenExpiryLabel(tokenExpiry: Date | null | undefined): { label: string; variant: 'success' | 'warning' | 'error' } | null {
  if (!tokenExpiry) return null;

  const now = new Date();
  const diff = tokenExpiry.getTime() - now.getTime();

  if (diff < 0) {
    return { label: 'Expired', variant: 'error' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return { label: `${days}d remaining`, variant: 'success' };
  }

  if (hours > 24) {
    return { label: `${days}d remaining`, variant: 'warning' };
  }

  return { label: `${hours}h remaining`, variant: 'error' };
}

function formatFollowerCount(count: number | null | undefined): string | null {
  if (!count) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function AccountCard({ platform: platformProp, status: statusProp, account, onConnect, onDisconnect, onReconnect, onConnectSession }: AccountCardProps) {
  const isFullAccount = account != null;
  const platform = isFullAccount ? account.platform : platformProp!;
  const status = isFullAccount ? account.status : statusProp!;

  const isConnected = status === 'connected';
  const needsAttention = status === 'expired' || status === 'revoked' || status === 'error';
  const expiryInfo = isFullAccount ? getTokenExpiryLabel(account.tokenExpiry) : null;
  const sessionExpiry = isFullAccount ? getTokenExpiryLabel(account.cookieExpiry) : null;

  const username = isFullAccount ? account.platformUsername : null;
  const followers = isFullAccount ? formatFollowerCount(account.followerCount) : null;
  const hasSession = isFullAccount && account.sessionCookie;

  return (
    <Card className="rounded-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-muted-foreground shrink-0" aria-hidden="true">
              {platformIcon(platform)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate tracking-tight">
                {PLATFORM_DISPLAY_NAMES[platform] ?? platform}
              </p>
              {username && (
                <p className="text-xs text-muted-foreground truncate">{username}</p>
              )}
              {followers && isConnected && (
                <p className="text-xs text-muted-foreground">{followers} followers</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="secondary" className="gap-1 text-xs font-normal text-success rounded-sm">
                  <CheckCircle size={14} />
                  Connected
                </Badge>
              )}

              {needsAttention && (
                <Badge variant={statusVariant[status] ?? 'secondary'} className="text-xs font-normal capitalize rounded-sm">
                  <Warning size={14} />
                  {status}
                </Badge>
              )}

              {expiryInfo && isConnected && (
                <Badge
                  variant={expiryInfo.variant === 'error' ? 'destructive' : expiryInfo.variant === 'warning' ? 'default' : 'secondary'}
                  className="gap-1 text-xs font-normal rounded-sm"
                >
                  <Clock size={12} />
                  {expiryInfo.label}
                </Badge>
              )}

              {platform === 'linkedin' && isConnected && (
                <Badge
                  variant={hasSession ? 'outline' : 'secondary'}
                  className="gap-1 text-xs font-normal rounded-sm"
                >
                  <span className={`size-2 rounded-full ${hasSession ? 'bg-[#0A66C2]' : 'bg-muted-foreground/50'}`} />
                  {hasSession ? 'Session active' : 'No session'}
                </Badge>
              )}

              {platform === 'linkedin' && isConnected && sessionExpiry && (
                <Badge
                  variant={sessionExpiry.variant === 'error' ? 'destructive' : sessionExpiry.variant === 'warning' ? 'default' : 'outline'}
                  className="gap-1 text-xs font-normal rounded-sm"
                >
                  <Clock size={12} />
                  {sessionExpiry.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isConnected && (
                <Button variant="outline" size="sm" className="rounded-sm" onClick={onDisconnect}>
                  Disconnect
                </Button>
              )}

              {isConnected && platform === 'linkedin' && (
                <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={onConnectSession}>
                  <span className="size-3 rounded-full bg-[#0A66C2]" />
                  Connect Session
                </Button>
              )}

              {needsAttention && (
                <Button size="sm" className="rounded-sm" onClick={onReconnect}>
                  Reconnect
                </Button>
              )}

              {status === 'disconnected' && (
                <Button size="sm" className="rounded-sm" onClick={onConnect}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
