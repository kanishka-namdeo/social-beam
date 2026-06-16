'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner, CheckCircle, WarningCircle, Clock } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils';

interface SyncStatusData {
  status: 'idle' | 'syncing' | 'complete' | 'error';
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  accountsSynced: number;
  totalAccounts: number;
  error: string | null;
}

interface SyncStatusIndicatorProps {
  className?: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const [data, setData] = useState<SyncStatusData>({
    status: 'idle',
    lastSyncAt: null,
    nextSyncAt: null,
    accountsSynced: 0,
    totalAccounts: 0,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (!res.ok) return;
      const json = await res.json();
      setData({
        status: json.status || 'idle',
        lastSyncAt: json.lastSyncAt || null,
        nextSyncAt: json.nextSyncAt || null,
        accountsSynced: json.accountsSynced || 0,
        totalAccounts: json.totalAccounts || 0,
        error: json.error || null,
      });
    } catch {
      // Silently fail — not critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds when syncing, every 5 minutes otherwise
    const isSyncing = data.status === 'syncing';
    const interval = setInterval(fetchStatus, isSyncing ? 30000 : 300000);
    return () => clearInterval(interval);
  }, [fetchStatus, data.status]);

  if (isLoading) {
    return (
      <Card className={cn('bg-card', className)}>
        <CardContent className="flex items-center gap-2 p-3">
          <Spinner className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking sync status...</span>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    idle: {
      icon: <Clock className="size-4 text-muted-foreground" />,
      badge: <Badge variant="outline">Idle</Badge>,
      message: data.lastSyncAt
        ? `Last synced ${formatTimeAgo(data.lastSyncAt)}`
        : 'No sync has run yet',
    },
    syncing: {
      icon: <Spinner className="size-4 animate-spin text-brand" />,
      badge: <Badge variant="outline" className="bg-info/10 text-info border-info/20">Syncing</Badge>,
      message: `Syncing ${data.accountsSynced} of ${data.totalAccounts} accounts...`,
    },
    complete: {
      icon: <CheckCircle className="size-4 text-success" weight="fill" />,
      badge: <Badge variant="outline" className="bg-success/10 text-success border-success/20">Complete</Badge>,
      message: data.lastSyncAt
        ? `Last synced ${formatTimeAgo(data.lastSyncAt)}`
        : 'Sync complete',
    },
    error: {
      icon: <WarningCircle className="size-4 text-destructive" weight="fill" />,
      badge: <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>,
      message: data.error || 'Sync failed — retrying automatically',
    },
  };

  const config = statusConfig[data.status];

  return (
    <Card className={cn('bg-card', className)}>
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <p className="text-sm font-medium">{config.message}</p>
            {data.nextSyncAt && (
              <p className="text-xs text-muted-foreground">
                Next sync: {new Date(data.nextSyncAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        {config.badge}
      </CardContent>
    </Card>
  );
}
