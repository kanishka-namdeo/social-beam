'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PlayCircle } from '@phosphor-icons/react/ssr';
import { MediaPreview } from './media-preview';
import { renderRichText } from '@/lib/compose/preview-helpers';

interface YoutubePreviewProps {
  title?: string;
  content: string;
  account?: { platformUsername?: string | null; avatarUrl?: string | null };
  mediaUrls?: string[];
  signature?: { text: string; url?: string } | null;
}

export function YoutubePreview({ title, content, account, mediaUrls, signature }: YoutubePreviewProps) {
  return (
    <Card className="rounded-lg border-border">
      <CardContent className="p-0">
        {/* Video/Media thumbnail placeholder */}
        {mediaUrls && mediaUrls.length > 0 ? (
          <MediaPreview mediaUrls={mediaUrls} />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted">
            <PlayCircle className="size-12 text-muted-foreground" weight="fill" />
          </div>
        )}

        {/* Channel info */}
        <div className="p-preview">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-muted" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {account?.platformUsername ?? 'Your Channel'}
              </p>
            </div>
          </div>

          {/* Title */}
          {title && (
            <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
          )}

          {/* Description */}
          {content && (
            <p className="mt-1 text-xs text-muted-foreground truncate-2">{renderRichText(content)}</p>
          )}

          {/* Signature */}
          {signature && (
            <div className="mt-2 border-t border-border/50 pt-2">
              <p className="text-xs text-muted-foreground">{signature.text}</p>
              {signature.url && (
                <p className="text-xs text-primary">{signature.url}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
