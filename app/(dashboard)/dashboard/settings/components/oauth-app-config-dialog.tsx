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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Spinner, Link as LinkIcon, Question } from '@phosphor-icons/react';
import { platformIcon, PLATFORM_DISPLAY_NAMES } from '@/lib/oauth/platform-icons';

const PLATFORM_HELP: Record<string, { url: string; steps: string[] }> = {
  instagram: {
    url: 'https://developers.facebook.com/',
    steps: [
      'Go to developers.facebook.com and create a new app',
      'Add "Facebook Login" and "Instagram Graph API" as products',
      'In Settings > Basic, copy your App ID and App Secret',
      'Set your redirect URL in the app settings',
      'Note: You need a Business account linked to a Facebook Page',
    ],
  },
  facebook: {
    url: 'https://developers.facebook.com/',
    steps: [
      'Go to developers.facebook.com and create a new app',
      'Add "Facebook Login" as a product',
      'In Settings > Basic, copy your App ID and App Secret',
      'Add your site URL and redirect URI in Facebook Login settings',
      'Note: You need admin access to a Facebook Page',
    ],
  },
  x: {
    url: 'https://developer.x.com/',
    steps: [
      'Go to developer.x.com and create a project/app',
      'Set up OAuth 2.0 in your app settings',
      'Copy your Client ID and Client Secret',
      'Set the redirect URI to your callback URL',
      'Enable PKCE (required for OAuth 2.0)',
    ],
  },
  linkedin: {
    url: 'https://developer.linkedin.com/',
    steps: [
      'Go to developer.linkedin.com and create a new app',
      'Under "Products", add "Sign In with LinkedIn" using OpenID Connect',
      'Copy your Client ID and Client Secret from the Auth tab',
      'Set your redirect URL under OAuth 2.0 settings (must match your app callback URL)',
    ],
  },
  tiktok: {
    url: 'https://developers.tiktok.com/',
    steps: [
      'Go to developers.tiktok.com and register a new app',
      'Apply for "Content Posting API" permission',
      'Go to App Details and copy your Client Key and Client Secret',
      'Set your redirect URI under Redirect URLs',
    ],
  },
  pinterest: {
    url: 'https://developers.pinterest.com/',
    steps: [
      'Go to developers.pinterest.com and create a new app',
      'Under "Permissions", enable the scopes you need',
      'Copy your App ID and App Secret from the app dashboard',
      'Set your redirect URI under Redirect URLs',
    ],
  },
};

interface OauthAppConfigDialogProps {
  open: boolean;
  platform: string;
  isConfigured: boolean;
  onClose: () => void;
  onSaved: (saved: boolean) => void;
}

export function OauthAppConfigDialog({ open, platform, isConfigured, onClose, onSaved }: OauthAppConfigDialogProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = PLATFORM_DISPLAY_NAMES[platform] ?? platform;
  const help = PLATFORM_HELP[platform];

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    if (!clientId.trim()) {
      setError('Client ID is required');
      setLoading(false);
      return;
    }

    if (!clientSecret.trim()) {
      setError('Client Secret is required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/settings/oauth-apps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Failed to save credentials');
        return;
      }

      onSaved(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/settings/oauth-apps/${platform}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to remove credentials');
        return;
      }

      onSaved(false);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {platformIcon(platform)}
            </span>
            <DialogTitle>Configure {displayName} App</DialogTitle>
          </div>
          <DialogDescription>
            Paste the Client ID and Client Secret from your {displayName} developer app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`client-id-${platform}`} className="text-sm font-medium">Client ID</Label>
            <Input
              id={`client-id-${platform}`}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your Client ID"
              autoComplete="off"
              spellCheck={false}
              className="border-border focus-within:border-brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`client-secret-${platform}`} className="text-sm font-medium">Client Secret</Label>
            <Input
              id={`client-secret-${platform}`}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter your Client Secret"
              autoComplete="off"
              spellCheck={false}
              className="border-border focus-within:border-brand"
            />
          </div>

          {help && (
            <Accordion type="single" collapsible>
              <AccordionItem value="setup">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Question className="size-4" />
                    How to get your {displayName} credentials
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <a
                      href={help.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <LinkIcon className="size-3" />
                      Open {displayName} Developer Portal
                    </a>
                    <ol className="list-decimal space-y-1 pl-5">
                      {help.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex gap-2">
            {isConfigured && (
              <Button variant="destructive" onClick={handleRemove} disabled={loading}>
                Remove
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
