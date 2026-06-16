'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { notifySuccessWithCategory } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { Trash } from '@phosphor-icons/react/ssr';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';

interface ScrapedDataCounts {
  redditTrendingPosts: number;
  engagementItems: number;
  externalPosts: number;
  followerSnapshots: number;
  analyticsSnapshots: number;
  redditConfigs: number;
  total: number;
}

interface DisconnectDialogProps {
  open: boolean;
  platform: string;
  accountId: string;
  onClose: () => void;
  onDisconnectSuccess: () => void;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  redditTrendingPosts: 'trending posts',
  engagementItems: 'engagement items',
  externalPosts: 'imported posts',
  followerSnapshots: 'follower snapshots',
  analyticsSnapshots: 'analytics snapshots',
  redditConfigs: 'Reddit configs',
};

export function DisconnectDialog({
  open,
  platform,
  accountId,
  onClose,
  onDisconnectSuccess,
}: DisconnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataCounts, setDataCounts] = useState<ScrapedDataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [deleteScrapedData, setDeleteScrapedData] = useState(false);

  useEffect(() => {
    if (open && platform) {
      setDataCounts(null);
      setDeleteScrapedData(false);
      fetchCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, platform]);

  async function fetchCounts() {
    setLoadingCounts(true);
    try {
      const res = await fetch(`/api/settings/accounts/${platform}`);
      if (res.ok) {
        const data = (await res.json()) as { counts: ScrapedDataCounts };
        setDataCounts(data.counts);
      }
    } catch {
      // Silently fail - counts are optional
    } finally {
      setLoadingCounts(false);
    }
  }

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/settings/accounts/${platform}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, deleteScrapedData }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        deletedData?: { total: number };
      };

      if (!res.ok) {
        setError(data.error ?? 'Failed to disconnect account');
        return;
      }

      if (data.deletedData && data.deletedData.total > 0) {
        notifySuccessWithCategory('Account disconnected', {
          category: 'connection',
          description: `Deleted ${data.deletedData.total} scraped item${data.deletedData.total !== 1 ? 's' : ''}.`,
        });
      }

      onDisconnectSuccess();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const platformName = PLATFORM_DISPLAY_NAMES[platform] ?? platform;

  const countEntries = dataCounts
    ? (Object.entries(dataCounts) as [string, number][])
        .filter(([key, value]) => key !== 'total' && value > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {platformIcon(platform)}
            </span>
            <DialogTitle className="tracking-tight">Disconnect {platformName}</DialogTitle>
          </div>
          <DialogDescription>
            This will remove the connection to your {platformName} account. You will need to reconnect to use it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loadingCounts ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          ) : dataCounts ? (
            <>
              {dataCounts.total > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium tracking-tight">
                      Scraped data for {platformName}:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {countEntries
                        .map(([key, count]) => `${count} ${DATA_TYPE_LABELS[key] ?? key}`)
                        .join(', ')}
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border/50 p-3 transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={deleteScrapedData}
                      onChange={(e) => setDeleteScrapedData(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border-border accent-destructive"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none tracking-tight">
                        Delete all scraped data for this platform
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This will permanently remove all scraped posts, engagement data, and analytics for {platformName}. This action cannot be undone.
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No scraped data found for {platformName}.
                </p>
              )}
            </>
          ) : null}
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-sm" onClick={handleDisconnect} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Disconnecting...
              </>
            ) : deleteScrapedData ? (
              <>
                <Trash className="mr-2 size-4" weight="bold" />
                Disconnect & Delete Data
              </>
            ) : (
              'Disconnect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
