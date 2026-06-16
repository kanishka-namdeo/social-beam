'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ShareNetwork } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ConnectAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  stepNumber: number;
  totalSteps: number;
  initiallyConnected: string[];
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: '📷' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: '👥' },
  { id: 'x', name: 'X (Twitter)', color: '#000000', icon: '🐦' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: '🎵' },
  { id: 'pinterest', name: 'Pinterest', color: '#E60023', icon: '📌' },
  { id: 'threads', name: 'Threads', color: '#000000', icon: '🧵' },
  { id: 'bluesky', name: 'Bluesky', color: '#0085FF', icon: '🦋' },
] as const;

export function ConnectAccountsDialog({
  open,
  onOpenChange,
  onComplete,
  stepNumber,
  totalSteps,
  initiallyConnected,
}: ConnectAccountsDialogProps) {
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(
    new Set(initiallyConnected)
  );
  const oauthChannelRef = useRef<BroadcastChannel | null>(null);
  const popupPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    oauthChannelRef.current = new BroadcastChannel('oauth-callback');
    oauthChannelRef.current.onmessage = (event: MessageEvent) => {
      const { platform, success } = event.data as { platform: string; success: boolean };
      if (success) {
        setConnectedPlatforms((prev) => new Set([...prev, platform]));
        toast.success(`${platform} connected successfully!`);
      }
    };
    return () => {
      oauthChannelRef.current?.close();
    };
  }, []);

  const handleConnectPlatform = useCallback(async (platform: string) => {
    try {
      const response = await fetch('/api/onboarding/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const { authUrl } = (await response.json()) as { authUrl: string };
      if (!authUrl) return;

      const width = 600;
      const height = 700;
      const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 0;
      const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 0;
      const popup = window.open(
        authUrl,
        `oauth-${platform}`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Popup was blocked by your browser. Please allow popups and try again.');
        return;
      }

      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          popupPollRef.current = null;
        }
      }, 500);
      popupPollRef.current = poll;
    } catch {
      toast.error(`Failed to connect ${platform}. Please try again.`);
    }
  }, []);

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {stepNumber} of {totalSteps}
            </span>
          </div>
          <DialogTitle>Connect Your Social Accounts</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Connect your social media accounts to start posting. You can connect more accounts later.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {PLATFORMS.map((platform) => {
            const isConnected = connectedPlatforms.has(platform.id);

            return (
              <Card
                key={platform.id}
                className={`relative transition-all ${
                  isConnected ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:border-primary'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${platform.color}15` }}
                      >
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        {isConnected && (
                          <p className="text-sm text-green-600 dark:text-green-400">Connected</p>
                        )}
                      </div>
                    </div>

                    {isConnected ? (
                      <CheckCircle
                        weight="fill"
                        className="w-6 h-6 text-green-500"
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectPlatform(platform.id)}
                      >
                        <ShareNetwork className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
