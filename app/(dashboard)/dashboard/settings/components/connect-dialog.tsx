'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@phosphor-icons/react/ssr';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';

interface ConnectDialogProps {
  open: boolean;
  platform: string;
  onClose: () => void;
}

export function ConnectDialog({ open, platform, onClose }: ConnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/settings/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      const data = (await res.json()) as { authUrl?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Failed to initiate connection');
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {platformIcon(platform)}
            </span>
            <DialogTitle className="tracking-tight">Connect {PLATFORM_DISPLAY_NAMES[platform]}</DialogTitle>
          </div>
          <DialogDescription>
            You&apos;ll be redirected to {PLATFORM_DISPLAY_NAMES[platform]} to authorize the connection.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="rounded-sm" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 size-4" />
                Connecting...
              </>
            ) : (
              `Connect ${PLATFORM_DISPLAY_NAMES[platform]}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
