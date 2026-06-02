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
import { Loader2 } from 'lucide-react';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';

interface DisconnectDialogProps {
  open: boolean;
  platform: string;
  accountId: string;
  onClose: () => void;
  onDisconnectSuccess: () => void;
}

export function DisconnectDialog({
  open,
  platform,
  accountId,
  onClose,
  onDisconnectSuccess,
}: DisconnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/settings/accounts/${platform}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Failed to disconnect account');
        return;
      }

      onDisconnectSuccess();
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
            <DialogTitle className="tracking-tight">Disconnect {PLATFORM_DISPLAY_NAMES[platform]}</DialogTitle>
          </div>
          <DialogDescription>
            This will remove the connection to your {PLATFORM_DISPLAY_NAMES[platform]} account. You will need to reconnect to use it again.
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
          <Button variant="destructive" className="rounded-sm" onClick={handleDisconnect} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Disconnecting...
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
