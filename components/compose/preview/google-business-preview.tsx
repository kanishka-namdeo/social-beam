'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from '@phosphor-icons/react/ssr';
import { MediaPreview } from './media-preview';

interface GoogleBusinessPreviewProps {
  content: string;
  account?: { platformUsername?: string | null; avatarUrl?: string | null };
  mediaUrls?: string[];
}

export function GoogleBusinessPreview({ content, account, mediaUrls }: GoogleBusinessPreviewProps) {
  return (
    <Card className="rounded-lg border-border">
      <CardContent className="p-4">
        {/* Business header */}
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
            <MapPin className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {account?.platformUsername ?? 'Your Business'}
            </p>
            <p className="text-xs text-muted-foreground">Google Business Post</p>
          </div>
        </div>

        {/* Post content */}
        {content && (
          <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">{content}</p>
        )}

        {/* Media */}
        {mediaUrls && mediaUrls.length > 0 && (
          <MediaPreview mediaUrls={mediaUrls} className="mt-3 rounded-sm overflow-hidden" />
        )}
      </CardContent>
    </Card>
  );
}
