'use client';

import { useState } from 'react';
import { Link as LinkIcon, ImageSquare } from '@phosphor-icons/react/ssr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface BioLink {
  id: string;
  title: string;
  url: string;
}

interface BioData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  links: BioLink[];
  theme: {
    bgColor: string;
    buttonBgColor: string;
    buttonTextColor: string;
  };
}

interface LinkInBioViewerProps {
  handle?: string;
  initialData?: BioData;
}

function isValidUrl(urlString: string): boolean {
  if (!urlString.trim()) return false;
  try {
    const url = new URL(urlString);
    if (url.protocol === 'javascript:' || url.protocol === 'data:') return false;
    return true;
  } catch {
    return false;
  }
}

function loadFromStorage(handle: string): BioData | null {
  try {
    const raw = localStorage.getItem(`sb-bio-${handle}`);
    if (raw) return JSON.parse(raw) as BioData;
  } catch { /* ignore */ }
  return null;
}

export function LinkInBioViewer({ handle, initialData }: LinkInBioViewerProps) {
  const [data] = useState<BioData | null>(
    () => initialData ?? (handle ? loadFromStorage(handle) : null),
  );

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-4">
          <ImageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
          <p className="text-muted-foreground">
            This bio page does not exist or has not been saved yet.
          </p>
        </div>
      </div>
    );
  }

  const { bgColor, buttonBgColor, buttonTextColor } = data.theme;
  const validLinks = data.links.filter((l) => l.title.trim() && isValidUrl(l.url));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="w-20 h-20 mb-4">
            {data.avatarUrl && isValidUrl(data.avatarUrl) ? (
              <AvatarImage src={data.avatarUrl} alt={data.displayName || 'Avatar'} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground text-lg">
              {data.displayName
                ? data.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                : '?'}
            </AvatarFallback>
          </Avatar>
          {data.displayName && (
            <h1 className="text-xl font-semibold text-foreground mb-1">
              {data.displayName}
            </h1>
          )}
          {data.bio && (
            <p className="text-sm text-muted-foreground max-w-xs">
              {data.bio}
            </p>
          )}
        </div>

        {/* Links */}
        {validLinks.length > 0 && (
          <div className="space-y-3">
            {validLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="ghost"
                  className="w-full min-h-12 justify-between gap-3 rounded-sm px-4 text-base font-medium hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: buttonBgColor,
                    color: buttonTextColor,
                  }}
                >
                  <span className="truncate">{link.title}</span>
                  <LinkIcon weight="bold" className="w-4 h-4 shrink-0" />
                </Button>
              </a>
            ))}
          </div>
        )}

        {validLinks.length === 0 && (
          <div className="text-center py-8">
            <LinkIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No links added yet.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">SocialBeam</span>
        </p>
      </div>
    </div>
  );
}
